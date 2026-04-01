import { Sale } from "../../domain/Sale";
import { SaleItem } from "../../domain/SaleItem";
import type { ReserveStock } from "../ports/ReserveStock";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductInfo } from "../ports/GetProductInfo";
import { PriceVO } from "../../../shared/domain/Price.VO";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

interface AddItemToSaleProps {
  saleId: string;
  itemId: string;
  quantity: number; 
}

export class AddItemToSale {
  constructor(
    private reserveStock: ReserveStock,
    private saleRepository: SaleRepository,
    private getProductInfo: GetProductInfo
  ) {}
  async execute(props: AddItemToSaleProps) {
    const saleResult = await this.saleRepository.getSaleById(props.saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    const sale = saleResult.getValue()!;
    const reserveStockResult = await this.reserveStock.execute(props.itemId, props.quantity);
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute(props.itemId);
    if (!productInfoResult.isSuccess) {
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()!;
    const itemResult = SaleItem.create({
      id: props.itemId,
      productName: productInfo.name,
      quantity: props.quantity,
      price: new PriceVO(productInfo.price),
      total: new PriceVO(props.quantity * productInfo.price),
    });
    if (!itemResult.isSuccess) {
      return Result.fail(itemResult.getError());
    }
    sale.addItem(itemResult.getValue()!);
    await this.saleRepository.update(sale);
    return Result.ok(sale);
  }
}
