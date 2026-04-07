import type { HandleStockPort } from "../ports/HandleStockPort";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import { InvalidSaleStateError } from "../../domain/Errors/InvalidSaleStateError";
import { SaleStatus } from "../../domain/SaleStatus";

interface AddItemToSaleProps {
  saleId: string;
  itemId: string;
  quantity: number;
}

export class AddItemToSale {
  constructor(
    private handleStock: HandleStockPort,
    private saleRepository: SaleRepository,
    private getProductInfo: GetProductsInfo
  ) {}
  async execute(props: AddItemToSaleProps) {
    const saleResult = await this.saleRepository.getSaleById(props.saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    if (sale.getStatus() !== SaleStatus.DRAFT) {
      return Result.fail(new InvalidSaleStateError("Can only add items to a draft sale"));
    }
    const reserveStockResult = await this.handleStock.reserveStock(
      props.itemId,
      props.quantity
    );
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute([props.itemId]);
    if (!productInfoResult.isSuccess) {
      await this.handleStock.releaseStock(props.itemId, props.quantity);
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()![0];
    sale.addItem({
      productId: props.itemId,
      nameSnapshot: productInfo.name,
      quantity: props.quantity,
      priceSnapshot: productInfo.price,
      subTotal: props.quantity * productInfo.price,
    });
    await this.saleRepository.update(sale);
    return Result.ok(sale);
  }
}
