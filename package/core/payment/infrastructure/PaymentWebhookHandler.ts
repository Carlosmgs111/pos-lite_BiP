import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { ExternalPaymentEvent } from "../domain/PaymentGateway";

export class PaymentWebhookHandler {
  // In-memory dedup of processed transactionIds. For production with multiple instances,
  // back this with a persistent store (Redis SET with TTL, DB unique constraint).
  private readonly processedTransactionIds = new Set<string>();

  constructor(private confirmPayment: ConfirmPayment) {}

  async handle(event: ExternalPaymentEvent): Promise<void> {
    const { payload } = event;
    if (this.processedTransactionIds.has(payload.transactionId)) {
      return;
    }
    this.processedTransactionIds.add(payload.transactionId);
    const result = await this.confirmPayment.execute({
      transactionId: payload.transactionId,
      success: payload.success,
    });
    if (!result.isSuccess) {
      throw result.getError() ?? new Error("Webhook confirmation failed");
    }
  }
}
