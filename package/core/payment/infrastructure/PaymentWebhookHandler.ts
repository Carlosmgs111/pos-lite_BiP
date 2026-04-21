import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { ExternalPaymentEvent } from "../domain/PaymentGateway";

export class PaymentWebhookHandler {
  constructor(private confirmPayment: ConfirmPayment) {}

  async handle(event: ExternalPaymentEvent): Promise<void> {
    const { provider, payload } = event;
    console.log("Payment transaction provider", provider);
    const result = await this.confirmPayment.execute({
      transactionId: payload.transactionId,
      success: payload.success,
    });
    if (!result.isSuccess) {
      console.error("Error confirming payment", result.getError());
    }
  }
}
