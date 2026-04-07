import { Result } from "../../../shared/domain/Result";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

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
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const cancelSaleResult = sale.cancelSale();
    if (!cancelSaleResult.isSuccess) {
      return Result.fail(cancelSaleResult.getError());
    }
    for (const item of sale.getItems()) {
      await this.handleStock.releaseStock(item.getProductId(), item.getQuantity());
    }
    return Result.ok();
  }
}
