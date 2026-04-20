import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { WebhookEvent } from "../domain/PaymentGateway";

export class WebhookHandler {
  constructor(private confirmPayment: ConfirmPayment) {}

  async handle(event: WebhookEvent): Promise<void> {
    const result = await this.confirmPayment.execute({
      transactionId: event.transactionId,
      success: event.success,
    });
    if (!result.isSuccess) {
      console.error("Error confirming payment", result.getError());
    }
  }
}
