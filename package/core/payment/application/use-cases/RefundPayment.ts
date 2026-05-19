import type { PaymentRepository } from "../../domain/PaymentRepository";
import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Payment, PaymentType, PaymentStatus } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { InvalidPaymentError } from "../../domain/Errors/InvalidPaymentError";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { UuidVO } from "../../../shared/domain/Uuid.VO";
import { RefundRequested } from "../../domain/events/RefundRequested";
import type { EventBus } from "../../../shared/domain/bus/EventBus";
import { PaymentOrderStatus } from "../../domain/PaymentOrder";

export class RefundPayment {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentOrderRepository: PaymentOrderRepository,
    private eventBus: EventBus
  ) {}

  async execute(paymentId: string): Promise<Result<Error, void>> {
    const paymentResult = await this.paymentRepository.findById(paymentId);
    if (!paymentResult.isSuccess || !paymentResult.getValue()) {
      return Result.fail(new Error("Payment not found"));
    }
    const original = paymentResult.getValue()!;

    if (original.getStatus() !== PaymentStatus.COMPLETED) {
      return Result.fail(
        new InvalidPaymentError("Can only refund a completed payment")
      );
    }
    if (original.getType() !== PaymentType.CHARGE) {
      return Result.fail(
        new InvalidPaymentError("Can only refund a charge payment")
      );
    }

    const allPaymentsResult = await this.paymentRepository.findByPaymentOrderId(
      original.getPaymentOrderId()
    );
    const allPayments = allPaymentsResult.isSuccess
      ? allPaymentsResult.getValue()
      : [];
    const existingRefunds = allPayments.filter(
      (p) =>
        p.getOriginalPaymentId() === original.getId().getValue() &&
        (p.getStatus() === PaymentStatus.COMPLETED ||
          p.getStatus() === PaymentStatus.PENDING)
    );
    const refundedTotal = existingRefunds.reduce(
      (sum, p) => sum + p.getAmount().getValueInCents(),
      0
    );
    if (refundedTotal + original.getAmount().getValueInCents() > original.getAmount().getValueInCents()) {
      return Result.fail(
        new InvalidPaymentError("Refund amount exceeds refundable amount")
      );
    }

    const refund = Payment.createRefund({
      id: UuidVO.generate(),
      paymentOrderId: original.getPaymentOrderId(),
      originalPaymentId: original.getId().getValue(),
      method: original.getMethod(),
      amount: original.getAmount().getValue(),
    });
    await this.paymentRepository.save(refund);

    const orderResult = await this.paymentOrderRepository.findById(
      original.getPaymentOrderId()
    );
    if (orderResult.isSuccess && orderResult.getValue()) {
      const order = orderResult.getValue()!;
      if (order.getStatus() === PaymentOrderStatus.COMPLETED) {
        order.markAsRefundPending();
        await this.paymentOrderRepository.update(order);
      }
    }

    const orderForEvent = orderResult.isSuccess && orderResult.getValue()
      ? orderResult.getValue()!
      : null;
    if (orderForEvent) {
      await this.eventBus.publish(
        RefundRequested.create({
          aggregateId: refund.getId().getValue(),
          version: refund.getVersion(),
          refundPaymentId: refund.getId().getValue(),
          originalPaymentId: original.getId().getValue(),
          saleId: orderForEvent.getSaleId().getValue(),
          amount: refund.getAmount().getValue(),
        })
      );
    }

    return Result.ok(undefined);
  }
}
