import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { Payment, PaymentType, PaymentStatus } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { InvalidPaymentError } from "../../domain/Errors/InvalidPaymentError";
import { UuidVO } from "../../../shared/domain/Uuid.VO";
import { RefundRequested } from "../../domain/events/RefundRequested";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

// 🛠️ FASE 9: CancelPaymentOrder — Reescrito con refund cascade
// ! [ANTES] CancelPaymentOrder solo marcaba PaymentOrder como CANCELLED sin manejar payments existentes
// ? [DESPUÉS] Falla charges PENDING, crea refund requests para charges COMPLETED, y transiciona COMPLETED → REFUND_PENDING → CANCELLED

export class CancelPaymentOrder {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private paymentRepository: PaymentRepository,
    private eventBus: EventBus
  ) {}

  async execute(saleId: string): Promise<Result<Error, void>> {
    // 1. Buscar PaymentOrder
    const orderResult = await this.paymentOrderRepository.findBySaleId(saleId);
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    const order = orderResult.getValue();
    if (!order) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    if (order.isTerminal()) {
      return Result.fail(new InvalidPaymentError("Order is terminal"));
    }

    // 2. Obtener todos los payments
    const paymentsResult = await this.paymentRepository.findByPaymentOrderId(
      order.getId().getValue()
    );
    const payments = paymentsResult.isSuccess
      ? paymentsResult.getValue()
      : [];

    // 3. Fallar charges PENDING
    for (const payment of payments) {
      if (
        payment.getType() === PaymentType.CHARGE &&
        payment.getStatus() === PaymentStatus.PENDING
      ) {
        payment.fail();
        await this.paymentRepository.update(payment);
      }
    }

    // 4. Identificar charges COMPLETED que necesitan refund
    const completedCharges = payments.filter(
      (p) =>
        p.getType() === PaymentType.CHARGE &&
        p.getStatus() === PaymentStatus.COMPLETED
    );

    if (completedCharges.length > 0) {
      // Hay dinero cobrado → crear refund requests
      order.markAsRefundPending();
      await this.paymentOrderRepository.update(order);

      for (const charge of completedCharges) {
        const refund = Payment.createRefund({
          id: UuidVO.generate(),
          paymentOrderId: order.getId().getValue(),
          originalPaymentId: charge.getId().getValue(),
          method: charge.getMethod(),
          amount: charge.getAmount().getValue(),
        });
        await this.paymentRepository.save(refund);

        // Emitir evento de refund solicitado
        await this.eventBus.publish(
          RefundRequested.create({
            aggregateId: refund.getId().getValue(),
            version: refund.getVersion(),
            refundPaymentId: refund.getId().getValue(),
            originalPaymentId: charge.getId().getValue(),
            saleId: order.getSaleId().getValue(),
            amount: refund.getAmount().getValue(),
          })
        );
      }
    } else {
      // No hay nada que refundear → cancelar directamente
      order.cancel();
      await this.paymentOrderRepository.update(order);
    }

    return Result.ok(undefined);
  }
}
