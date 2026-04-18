import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { WebhookEvent } from "../domain/PaymentGateway";
import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";

export class WebhookHandler {
  constructor(
    private confirmPayment: ConfirmPayment,
    private paymentRepository: PaymentOrderRepository
  ) {}

  async handle(event: WebhookEvent): Promise<void> {
    const orderResult = await this.paymentRepository.findByPaymentId(event.transactionId);
    if (!orderResult.isSuccess) {
      console.error("Error al buscar el pedido", orderResult.getError());
      return;
    }
    if (!orderResult.getValue()) {
      console.error("Pedido no encontrado");
      return;
    }
    const paymentOrder = orderResult.getValue()!;
    console.log("Webhook received", { paymentOrder });
    await this.confirmPayment.execute(paymentOrder.getSaleId().getValue(), event.success);
  }
}
