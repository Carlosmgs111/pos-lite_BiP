import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { PaymentOrderFailed } from "../../../payment/domain/events/PaymentOrderFailed";
import type { FailSale } from "../use-cases/FailSale";
import { Result } from "../../../shared/domain/Result";

export class SaleFailedOnPayment implements EventHandler<PaymentOrderFailed> {
  constructor(private failSale: FailSale) {}
  async handle(event: PaymentOrderFailed): Promise<Result<Error, void>> {
    const { saleId } = event.payload;
    const result = await this.failSale.execute(saleId);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    return Result.ok(undefined);
  }
}
