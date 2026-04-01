import { Result } from "../../../shared/domain/Result";
import type { SaleRepository } from "../../domain/SaleRepository";
import { SaleNotFoundError } from "../../domain/SaleRepository";
import { Sale } from "../../domain/Sale";

export class RemoveItemFromSale {
  constructor(private saleRepository: SaleRepository) {}
  async execute({
    saleId,
    itemId,
    quantity,
  }: {
    saleId: string;
    itemId: string;
    quantity: number;
  }): Promise<Result<Error, boolean>> {
    const saleResult: Result<SaleNotFoundError, Sale> =
      await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    const sale: Sale = saleResult.getValue()!;
    const itemResult = sale.findItemById(itemId);
    if (!itemResult.isSuccess) {
      return Result.fail(itemResult.getError());
    }
    const item = itemResult.getValue()!;
    const decrementResult = item.decrementQuantity(quantity);
    if (!decrementResult.isSuccess) {
      return Result.fail(decrementResult.getError());
    }
    sale.recalculateTotal();
    await this.saleRepository.update(sale);
    return Result.ok(true);
  }
}
