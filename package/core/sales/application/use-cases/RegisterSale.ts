import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import type { HandleStockPort } from "../ports/HandleStockPort";

export class RegisterSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort
  ) {}
  async execute(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    const sale = saleResult.getValue()!;
    for (const item of sale.getItems()) {
      const confirmStockResult = await this.handleStock.commitStock(
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
