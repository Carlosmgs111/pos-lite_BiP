import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { SalesReadyToPay } from "../../../sales";
import type { CreatePaymentOrder } from "../../application/use-cases/CreatePaymentOrder";

export class CreatePaymentOrderOnSaleReady implements EventHandler<SalesReadyToPay> {
  constructor(private createPaymentOrder: CreatePaymentOrder) {}
  async handle(event: SalesReadyToPay): Promise<void> {
    await this.createPaymentOrder.execute(event.saleId, event.totalAmount);
  }
}
