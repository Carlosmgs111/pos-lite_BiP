import { Result } from "../../../shared/domain/Result";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { HandleStockPort } from "../ports/HandleStockPort";

export class CancelSale {
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
      await this.handleStock.releaseStock(item.getId(), item.getQuantity());
    }
    await this.saleRepository.delete(saleId);
    return Result.ok();
  }
}
