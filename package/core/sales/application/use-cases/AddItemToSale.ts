import { Sale } from "../../domain/Sale";
import { SaleItem } from "../../domain/SaleItem";
import type { ReserveStock } from "../ports/ReserveStock";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductInfo } from "../ports/GetProductInfo";
import { PriceVO } from "../../../shared/domain/Price.VO";
import { Result } from "../../../shared/domain/Result";

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
    const sale: Sale = await this.saleRepository.getSale(props.saleId);
    const reserveStockResult = await this.reserveStock.execute(props.itemId, props.quantity);
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute(props.itemId);
    if (!productInfoResult.isSuccess) {
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()!;
    const item = new SaleItem(
      props.itemId,
      productInfo.name,
      props.quantity,
      new PriceVO(productInfo.price),
      new PriceVO(props.quantity * productInfo.price)
    );
    console.log({item});
    sale.addItem(item);
    await this.saleRepository.update(sale);
    return Result.ok(sale);
  }
}
