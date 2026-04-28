import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { PaymentOrderCompleted } from "../../../payment/domain/events/PaymentOrderCompleted";
import type { CompleteSale } from "../use-cases/CompleteSale";
import { Result } from "../../../shared/domain/Result";
import type { ProcessedEventRepository } from "../../../shared/application/ProcessedEventRepository";

export class SaleCompletedOnPayment implements EventHandler<PaymentOrderCompleted> {
  constructor(
    private completeSale: CompleteSale,
    private processedEventRepository: ProcessedEventRepository
  ) {}
  async handle(event: PaymentOrderCompleted): Promise<Result<Error, void>> {
    const handlerName = this.constructor.name;
    if (
      await this.processedEventRepository.hasBeenProcessed(
        event.id,
        handlerName
      )
    ) {
      return Result.ok(undefined);
    }
    const { saleId } = event.payload;
    const result = await this.completeSale.execute(saleId);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    await this.processedEventRepository.markAsProcessed(event.id, handlerName);
    return Result.ok(undefined);
  }
}
