import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { SalesConfirmed } from "../../../sales";
import type { CreatePaymentOrder } from "../../application/use-cases/CreatePaymentOrder";

export class PaymentCompletedEventHandler implements EventHandler<SalesConfirmed> {
  constructor(private createPaymentOrder: CreatePaymentOrder) {}
  async handle(event: SalesConfirmed): Promise<void> {
    await this.createPaymentOrder.execute(event.saleId, event.totalAmount);
  }
}
