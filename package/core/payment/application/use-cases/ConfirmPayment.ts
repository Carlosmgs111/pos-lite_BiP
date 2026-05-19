import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrder";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../../domain/events/PaymentOrderFailed";
import { PaymentTransactionResult } from "../../domain/events/PaymentTransactionResult";
import type { EventBus } from "../../../shared/domain/bus/EventBus";
import { Payment } from "../../domain/Payment";
import { PaymentOrderProjectionService, PaymentCoverageState, type PaymentOrderSnapshot } from "../../domain/PaymentOrderProjectionService";

// 🛠️ FASE 8: ConfirmPayment — Reescrito con ProjectionService
// ! [ANTES] ConfirmPayment usaba retry policy (failedAttempts >= 3 → markAsFailed) y mutaba paidAmount/pendingAmount incrementalmente
// ? [DESPUÉS] ConfirmPayment persiste Payment primero (fuente financiera), proyecta cobertura, y sincroniza PaymentOrder status

type ConfirmPaymentInput = {
  paymentId?: string;
  transactionId?: string;
  success: boolean;
};

export class ConfirmPayment {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentOrderRepository: PaymentOrderRepository,
    private eventBus: EventBus
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<Result<Error, void>> {
    if (!input.paymentId && !input.transactionId) {
      return Result.fail(new Error("Payment ID or Transaction ID is required"));
    }

    // 1. Resolver Payment
    const payment = await this.resolvePayment(input);
    if (!payment) {
      return Result.fail(new Error("Payment not found"));
    }

    // 2. Transicionar Payment (fuente financiera)
    const transitionResult = input.success
      ? payment.complete()
      : payment.fail();
    if (!transitionResult.isSuccess) {
      return Result.fail(transitionResult.getError());
    }

    // 3. Persistir Payment PRIMERO
    await this.paymentRepository.update(payment);

    // 4. Cargar PaymentOrder
    const orderResult = await this.paymentOrderRepository.findById(
      payment.getPaymentOrderId()
    );
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const order = orderResult.getValue()!;

    // 5. Proyectar cobertura financiera desde el ledger
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

    // 6. Sincronizar PaymentOrder status SOLO si la cobertura lo justifica
    //    - FULLY_PAID → markAsCompleted() (si no está en REFUND_PENDING)
    //    - PARTIALLY_PAID → syncStatus(PARTIAL) (si está en PENDING)
    //    - FAILED NUNCA se deriva automáticamente
    //    - REFUND_PENDING es decisión operacional explícita
    await this.syncOrderStatus(order, snapshot);

    // 7. Publicar eventos
    await this.eventBus.publish(
      PaymentTransactionResult.create({
        aggregateId: payment.getId().getValue(),
        version: payment.getVersion(),
        paymentId: payment.getId().getValue(),
        success: input.success,
      })
    );

    if (order.getStatus() === PaymentOrderStatus.COMPLETED) {
      await this.eventBus.publish(
        PaymentOrderCompleted.create({
          aggregateId: order.getId().getValue(),
          version: order.getVersion(),
          saleId: order.getSaleId().getValue(),
        })
      );
    }

    return Result.ok(undefined);
  }

  private async resolvePayment(input: ConfirmPaymentInput): Promise<Payment | null> {
    if (input.paymentId) {
      const r = await this.paymentRepository.findById(input.paymentId);
      return r.isSuccess ? r.getValue() : null;
    }
    if (input.transactionId) {
      const r = await this.paymentRepository.findByExternalId(input.transactionId);
      return r.isSuccess ? r.getValue() : null;
    }
    return null;
  }

  private async syncOrderStatus(
    order: { getStatus(): string; markAsCompleted(): Result<any, void>; syncStatus(s: PaymentOrderStatus): Result<any, void> },
    snapshot: PaymentOrderSnapshot
  ): Promise<void> {
    if (snapshot.coverageState === PaymentCoverageState.FULLY_PAID
        && order.getStatus() !== PaymentOrderStatus.REFUND_PENDING) {
      const result = order.markAsCompleted();
      if (result.isSuccess) {
        await this.paymentOrderRepository.update(order as any);
      }
    } else if (snapshot.coverageState === PaymentCoverageState.PARTIALLY_PAID
               && order.getStatus() === PaymentOrderStatus.PENDING) {
      const result = order.syncStatus(PaymentOrderStatus.PARTIAL);
      if (result.isSuccess) {
        await this.paymentOrderRepository.update(order as any);
      }
    }
  }
}
