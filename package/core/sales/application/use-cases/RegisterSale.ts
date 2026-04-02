import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import type { HandleStockPort } from "../ports/HandleStockPort";

export class RegisterSale {
  constructor(
    private saleRepository: SaleRepository,
    private confirmStock: HandleStockPort
  ) {}
  async execute(saleId: string): Promise<Result<SaleNotFoundError, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    const sale = saleResult.getValue()!;
    for (const item of sale.getItems()) {
      const confirmStockResult = await this.confirmStock.commitStock(
        item.getId(),
        item.getQuantity()
      );
      if (!confirmStockResult.isSuccess) {
        return Result.fail(confirmStockResult.getError());
      }
    }
    sale.completeSale();
    return this.saleRepository.update(sale);
  }
}
