import type { HandleStockPort } from "../ports/HandleStockPort";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

interface SetItemQuantityProps {
  saleId: string;
  itemId: string;
  quantity: number;
}

export class SetItemQuantity {
  constructor(
    private handleStock: HandleStockPort,
    private saleRepository: SaleRepository,
    private getProductInfo: GetProductsInfo
  ) {}

  async execute(props: SetItemQuantityProps) {
    const saleResult = await this.saleRepository.getSaleById(props.saleId);
    if (!saleResult.isSuccess) return Result.fail(saleResult.getError());
    const sale = saleResult.getValue();
    if (!sale) return Result.fail(new SaleNotFoundError());
    if (!sale.canAddItem().isSuccess) return Result.fail(sale.canAddItem().getError()!);

    const existing = sale.getItemByProductId(props.itemId);
    const currentQty = existing?.getQuantity() ?? 0;
    if (currentQty === props.quantity) return Result.ok(sale);

    const delta = props.quantity - currentQty;

    let productInfo: { name: string; price: number } | null = null;
    if (currentQty === 0 && props.quantity > 0) {
      const infoR = await this.getProductInfo.execute([props.itemId]);
      if (!infoR.isSuccess) return Result.fail(infoR.getError());
      const info = infoR.getValue()![0];
      productInfo = { name: info.name, price: info.price };
    }

    if (delta > 0) {
      const r = await this.handleStock.reserveStock(props.itemId, delta);
      if (!r.isSuccess) return Result.fail(r.getError());
    } else if (delta < 0) {
      const r = await this.handleStock.releaseStock(props.itemId, -delta);
      if (!r.isSuccess) return Result.fail(r.getError());
    }

    const setResult = sale.setItemQuantity(
      props.itemId,
      productInfo ?? { name: "", price: 0 },
      props.quantity
    );

    if (!setResult.isSuccess) {
      if (delta > 0) await this.handleStock.releaseStock(props.itemId, delta);
      else if (delta < 0) await this.handleStock.reserveStock(props.itemId, -delta);
      return Result.fail(setResult.getError());
    }

    const updateR = await this.saleRepository.update(sale);
    if (!updateR.isSuccess) {
      if (delta > 0) await this.handleStock.releaseStock(props.itemId, delta);
      else if (delta < 0) await this.handleStock.reserveStock(props.itemId, -delta);
      return Result.fail(updateR.getError());
    }

    return Result.ok(sale);
  }
}
