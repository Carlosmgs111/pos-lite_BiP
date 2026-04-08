import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { PaymentOrderCompleted } from "../../../payment/domain/events/PaymentOrderCompleted";
import type { CompleteSale } from "../use-cases/CompleteSale";

export class SaleCompletedOnPayment implements EventHandler<PaymentOrderCompleted> {
  constructor(private completeSale: CompleteSale) {}
  async handle(event: PaymentOrderCompleted): Promise<void> {
    await this.completeSale.execute(event.saleId);
  }
}
