import type { ConfirmPayment } from "../application/use-cases/ConfirmPayment";
import type { WebhookEvent } from "../domain/PaymentGateway";
import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";

export class WebhookHandler {
  constructor(
    private confirmPayment: ConfirmPayment,
    private paymentRepository: PaymentOrderRepository
  ) {}
  // TODO: Too much domain logic here
  async handle(event: WebhookEvent): Promise<void> {
    const orderResult = await this.paymentRepository.findByPaymentExternalId(
      event.transactionId
    );
    if (!orderResult.isSuccess) {
      console.error("Error al buscar el pedido", orderResult.getError());
      return;
    }
    if (!orderResult.getValue()) {
      console.error("Pedido no encontrado");
      return;
    }
    const paymentOrder = orderResult.getValue()!;
    const paymentId = paymentOrder
      .getPaymentByExternalId(event.transactionId)
      ?.getId()
      .getValue();
    if (!paymentId) {
      console.error("Payment not found");
      return;
    }
    console.log("Webhook received", { paymentOrder });
    const result = await this.confirmPayment.execute(paymentId, event.success);
    if (!result.isSuccess) {
      console.error("Error al confirmar el pago", result.getError());
      return;
    }
    console.log("Payment confirmed");
  }
}
