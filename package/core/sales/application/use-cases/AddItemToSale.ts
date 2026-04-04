import type { HandleStockPort } from "../ports/HandleStockPort";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

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
    const reserveStockResult = await this.handleStock.reserveStock(
      props.itemId,
      props.quantity
    );
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute([props.itemId]);
    if (!productInfoResult.isSuccess) {
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()![0];
    const addItemResult = sale.addItem({
      id: props.itemId,
      productName: productInfo.name,
      quantity: props.quantity,
      price: productInfo.price,
      total: props.quantity * productInfo.price,
    });
    if (!addItemResult.isSuccess) {
      return Result.fail(addItemResult.getError());
    }
    await this.saleRepository.update(sale);
    return Result.ok(sale);
  }
}
