import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

export class CompleteSale {
  constructor(private saleRepository: SaleRepository) {}
  async execute(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const completeResult = sale.completeSale();
    if (!completeResult.isSuccess) {
      return Result.fail(completeResult.getError());
    }
    return this.saleRepository.update(sale);
  }
}
