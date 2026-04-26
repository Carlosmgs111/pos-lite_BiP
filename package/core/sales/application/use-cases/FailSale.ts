import type { SaleRepository } from "../../domain/SaleRepository";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

export class FailSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort
  ) {}
  async execute(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const failResult = sale.failSale();
    if (!failResult.isSuccess) {
      return Result.fail(failResult.getError());
    }

    // Persist CANCELLED first so a retry does not re-trigger this path on the same sale.
    // Stock restoration is then best-effort: failures are logged but not propagated, since
    // the sale is already terminal and a partial restore is preferable to a stuck retry loop.
    const updateResult = await this.saleRepository.update(sale);
    if (!updateResult.isSuccess) {
      return Result.fail(updateResult.getError());
    }

    for (const item of sale.getItems()) {
      const restoreResult = await this.handleStock.restoreStock(
        item.getProductId(),
        item.getQuantity()
      );
      if (!restoreResult.isSuccess) {
        console.error(
          `[FailSale] failed to restore stock for ${item.getProductId()} on sale ${sale.getId()}:`,
          restoreResult.getError()
        );
      }
    }
    return Result.ok(undefined);
  }
}
