import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { RefundCompleted } from "../../../payment/domain/events/RefundCompleted";
import type { FailSale } from "../use-cases/FailSale";
import { Result } from "../../../shared/domain/Result";

export class SaleRefundCompletedOnPayment implements EventHandler<RefundCompleted> {
  constructor(private failSale: FailSale) {}

  async handle(event: RefundCompleted): Promise<Result<Error, void>> {
    const { saleId } = event.payload;
    const result = await this.failSale.execute(saleId);
    if (!result.isSuccess) {
      return Result.ok(undefined);
    }
    return Result.ok(undefined);
  }
}
