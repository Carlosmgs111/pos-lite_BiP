import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { PaymentOrderCompleted } from "../../../payment/domain/events/PaymentOrderCompleted";
import type { CompleteSale } from "../use-cases/CompleteSale";
import { Result } from "../../../shared/domain/Result";

export class SaleCompletedOnPayment implements EventHandler<PaymentOrderCompleted> {
  constructor(private completeSale: CompleteSale) {}
  async handle(event: PaymentOrderCompleted): Promise<Result<Error, void>> {
    const { saleId } = event.payload;
    const result = await this.completeSale.execute(saleId);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    return Result.ok(undefined);
  }
}
