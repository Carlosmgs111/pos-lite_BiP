import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import { SalesConfirmed } from "../../domain/events/SalesConfirmed";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

export class RegisterSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort,
    private eventBus: EventBus
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
    for (const item of sale.getItems()) {
      const confirmStockResult = await this.handleStock.commitStock(
        item.getProductId(),
        item.getQuantity()
      );
      if (!confirmStockResult.isSuccess) {
        return Result.fail(confirmStockResult.getError());
      }
    }
    const confirmResult = sale.confirmSale();
    if (!confirmResult.isSuccess) {
      return Result.fail(confirmResult.getError());
    }
    const salesConfirmedEvent = new SalesConfirmed(saleId, sale.getTotal().getValue());
    this.eventBus.publish(salesConfirmedEvent);
    return this.saleRepository.update(sale);
  }
}
