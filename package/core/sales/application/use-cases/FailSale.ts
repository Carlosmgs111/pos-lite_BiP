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
    for (const item of sale.getItems()) {
      const restoreResult = await this.handleStock.restoreStock(
        item.getProductId(),
        item.getQuantity()
      );
      if (!restoreResult.isSuccess) {
        return Result.fail(restoreResult.getError());
      }
    }
    return this.saleRepository.update(sale);
  }
}
