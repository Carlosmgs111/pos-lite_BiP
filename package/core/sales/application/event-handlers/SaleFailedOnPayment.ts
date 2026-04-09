import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { PaymentOrderFailed } from "../../../payment/domain/events/PaymentOrderFailed";
import type { FailSale } from "../use-cases/FailSale";

export class SaleFailedOnPayment implements EventHandler<PaymentOrderFailed> {
  constructor(private failSale: FailSale) {}
  async handle(event: PaymentOrderFailed): Promise<void> {
    await this.failSale.execute(event.saleId);
  }
}
