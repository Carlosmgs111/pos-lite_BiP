import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { WebhookEvent } from "../domain/PaymentGateway";

export class WebhookHandler {
  constructor(
    private confirmPayment: ConfirmPayment
  ) {}

  async handle(event: WebhookEvent): Promise<void> {
    await this.confirmPayment.execute(event.transactionId, event.success);
  }
}
