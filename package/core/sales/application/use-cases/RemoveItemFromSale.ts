import { Result } from "../../../shared/domain/Result";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

export class RemoveItemFromSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort
  ) {}
  async execute({
    saleId,
    itemId,
    quantity,
  }: {
    saleId: string;
    itemId: string;
    quantity: number;
  }): Promise<Result<Error, boolean>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const itemResult = sale.findItemById(itemId);
    if (!itemResult.isSuccess) {
      return Result.fail(itemResult.getError());
    }
    const item = itemResult.getValue()!;
    const decrementResult = item.decrementQuantity(quantity);
    if (!decrementResult.isSuccess) {
      return Result.fail(decrementResult.getError());
    }
    const releaseResult = await this.handleStock.releaseStock(itemId, quantity);
    if (!releaseResult.isSuccess) {
      return Result.fail(releaseResult.getError());
    }
    sale.recalculateTotal();
    await this.saleRepository.update(sale);
    return Result.ok(true);
  }
}
