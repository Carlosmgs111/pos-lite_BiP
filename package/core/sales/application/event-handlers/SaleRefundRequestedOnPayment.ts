import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { RefundRequested } from "../../../payment/domain/events/RefundRequested";
import { Result } from "../../../shared/domain/Result";

export class SaleRefundRequestedOnPayment implements EventHandler<RefundRequested> {
  async handle(_event: RefundRequested): Promise<Result<Error, void>> {
    return Result.ok(undefined);
  }
}
