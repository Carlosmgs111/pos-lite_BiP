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

    const existing = sale.getItems().find((i) => i.getProductId() === props.itemId);
    const currentQty = existing?.getQuantity() ?? 0;
    const delta = props.quantity - currentQty;

    // Stock: reserve/release delta
    if (delta > 0) {
      const r = await this.handleStock.reserveStock(props.itemId, delta);
      if (!r.isSuccess) return Result.fail(r.getError());
    } else if (delta < 0) {
      const r = await this.handleStock.releaseStock(props.itemId, -delta);
      if (!r.isSuccess) return Result.fail(r.getError());
    }

    // Sale item: add / update / remove
    try {
      if (currentQty === 0) {
        const infoR = await this.getProductInfo.execute([props.itemId]);
        if (!infoR.isSuccess) throw infoR.getError();
        const info = infoR.getValue()![0];
        const addR = sale.addItem({ productId: props.itemId, nameSnapshot: info.name, quantity: props.quantity, priceSnapshot: info.price });
        if (!addR.isSuccess) throw addR.getError();
      } else if (props.quantity === 0) {
        const remR = sale.removeItem({ itemId: props.itemId, quantity: currentQty });
        if (!remR.isSuccess) throw remR.getError();
      } else {
        const item = sale.getItems().find((i) => i.getProductId() === props.itemId)!;
        if (delta > 0) item.incrementQuantity(delta);
        else if (delta < 0) item.decrementQuantity(-delta);
        sale.recalculateTotal();
      }
    } catch (e) {
      if (delta > 0) await this.handleStock.releaseStock(props.itemId, delta);
      return Result.fail(e as Error);
    }

    const updateR = await this.saleRepository.update(sale);
    if (!updateR.isSuccess) return Result.fail(updateR.getError());
    return Result.ok(sale);
  }
}
