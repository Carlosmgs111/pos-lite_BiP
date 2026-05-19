import type { PaymentRepository } from "../../domain/PaymentRepository";
import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Payment, PaymentType, PaymentStatus, PaymentSettlementSource } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { InvalidPaymentError } from "../../domain/Errors/InvalidPaymentError";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { RefundCompleted } from "../../domain/events/RefundCompleted";
import type { EventBus } from "../../../shared/domain/bus/EventBus";
import { PaymentOrderProjectionService } from "../../domain/PaymentOrderProjectionService";
import { PaymentOrderStatus } from "../../domain/PaymentOrder";

export class CompleteRefund {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentOrderRepository: PaymentOrderRepository,
    private eventBus: EventBus
  ) {}

  async execute(input: {
    refundPaymentId: string;
    settlementSource: PaymentSettlementSource;
    externalReference?: string;
    notes?: string;
  }): Promise<Result<Error, void>> {
    // 1. Buscar refund
    const refundResult = await this.paymentRepository.findById(
      input.refundPaymentId
    );
    if (!refundResult.isSuccess || !refundResult.getValue()) {
      return Result.fail(new Error("Refund payment not found"));
    }
    const refund = refundResult.getValue()!;

    // 2. Validaciones
    if (refund.getType() !== PaymentType.REFUND) {
      return Result.fail(
        new InvalidPaymentError("Payment is not a refund")
      );
    }

    // 3. Idempotencia
    if (refund.getStatus() === PaymentStatus.COMPLETED) {
      if (
        refund.getSettlementSource() === input.settlementSource &&
        refund.getExternalReference() === input.externalReference
      ) {
        return Result.ok(undefined); // idempotente
      }
      return Result.fail(
        new InvalidPaymentError(
          "Refund already completed with different settlement"
        )
      );
    }
    if (refund.getStatus() !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Refund is not pending")
      );
    }

    // 4. Completar refund con datos de liquidación
    refund.markAsSettled(
      input.settlementSource,
      input.externalReference,
      input.notes
    );
    await this.paymentRepository.update(refund);

    // 5. Recalcular proyección
    const orderResult = await this.paymentOrderRepository.findById(
      refund.getPaymentOrderId()
    );
    if (!orderResult.isSuccess || !orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const order = orderResult.getValue()!;

    const allPaymentsResult = await this.paymentRepository.findByPaymentOrderId(
      order.getId().getValue()
    );
    const allPayments = allPaymentsResult.isSuccess
      ? allPaymentsResult.getValue()
      : [];
    const snapshot = PaymentOrderProjectionService.project(
      order.getTotalAmount(),
      allPayments
    );

    // 6. Si todos los refunds están completados y la orden estaba en REFUND_PENDING
    if (
      !snapshot.hasPendingRefunds &&
      order.getStatus() === PaymentOrderStatus.REFUND_PENDING
    ) {
      order.cancel();
      await this.paymentOrderRepository.update(order);
    }

    // 7. Emitir evento de refund completado
    await this.eventBus.publish(
      RefundCompleted.create({
        aggregateId: refund.getId().getValue(),
        version: refund.getVersion(),
        refundPaymentId: refund.getId().getValue(),
        originalPaymentId: refund.getOriginalPaymentId()!,
        saleId: order.getSaleId().getValue(),
        amount: refund.getAmount().getValue(),
        settlementSource: input.settlementSource,
      })
    );

    return Result.ok(undefined);
  }
}
