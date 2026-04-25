import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import { SalesReadyToPay } from "../../domain/events/SalesReadyToPay";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

export class RegisterSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort,
    private eventBus: EventBus
  ) {}

  // TODO: implement non reserved stock check
  async execute(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const committed: Array<{ productId: string; quantity: number }> = [];
    for (const item of sale.getItems()) {
      const confirmStockResult = await this.handleStock.commitStock(
        item.getProductId(),
        item.getQuantity()
      );
      if (!confirmStockResult.isSuccess) {
        for (const c of committed) {
          const revertResult = await this.handleStock.revertCommitStock(
            c.productId,
            c.quantity
          );
          if (!revertResult.isSuccess) {
            console.error(
              `[RegisterSale] failed to revert commit for ${c.productId}:`,
              revertResult.getError()
            );
          }
        }
        return Result.fail(confirmStockResult.getError());
      }
      committed.push({
        productId: item.getProductId(),
        quantity: item.getQuantity(),
      });
    }
    const confirmResult = sale.confirmSale();
    if (!confirmResult.isSuccess) {
      return Result.fail(confirmResult.getError());
    }
    const salesReadyToPayEvent = new SalesReadyToPay({
      saleId,
      totalAmount: sale.getTotal().getValue(),
    });
    const updateResult = await this.saleRepository.update(sale);
    if (!updateResult.isSuccess) {
      return Result.fail(updateResult.getError());
    }
    await this.eventBus.publish(salesReadyToPayEvent);
    return Result.ok(undefined);
  }
}
