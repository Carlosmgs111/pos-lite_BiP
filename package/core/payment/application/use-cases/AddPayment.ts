import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import {
  Payment,
  PaymentMethod,
  PaymentSettlementSource,
} from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { InvalidPaymentError } from "../../domain/Errors/InvalidPaymentError";
import {
  PaymentOrderProjectionService,
  PaymentCoverageState,
} from "../../domain/PaymentOrderProjectionService";
import { PaymentOrderStatus } from "../../domain/PaymentOrder";

// 🛠️ FASE 12: AddPayment — Ajustado con ProjectionService
// ! [ANTES] AddPayment validaba usando order.pendingAmount y mutaba paidAmount/pendingAmount incrementalmente
// ? [DESPUÉS] AddPayment usa projection.remainingAmount para validar y sincroniza PaymentOrder status tras crear el Payment

export class AddPayment {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private paymentRepository: PaymentRepository
  ) {}

  async execute(input: {
    saleId: string;
    paymentId: string;
    method: PaymentMethod;
    amount: number;
  }): Promise<Result<Error, string>> {
    // 1. Buscar PaymentOrder
    const orderResult = await this.paymentOrderRepository.findBySaleId(
      input.saleId
    );
    if (!orderResult.isSuccess) return Result.fail(orderResult.getError());
    const order = orderResult.getValue();
    if (!order) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    if (order.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot add payment to a terminal order")
      );
    }

    // 2. Validar usando proyección
    const paymentsResult = await this.paymentRepository.findByPaymentOrderId(
      order.getId().getValue()
    );
    const payments = paymentsResult.isSuccess ? paymentsResult.getValue() : [];
    const snapshot = PaymentOrderProjectionService.project(
      order.getTotalAmount(),
      payments
    );

    // Validación: non-cash no puede exceder el remaining
    if (
      input.method !== PaymentMethod.CASH &&
      input.amount > snapshot.remainingAmount.getValue()
    ) {
      return Result.fail(
        new InvalidPaymentError("Non-cash payment exceeds remaining amount")
      );
    }
    if (input.amount <= 0) {
      return Result.fail(
        new InvalidPaymentError("Payment amount must be greater than zero")
      );
    }

    // 3. Crear Payment
    const payment = Payment.create({
      id: input.paymentId,
      paymentOrderId: order.getId().getValue(),
      method: input.method,
      amount: input.amount,
      settlementSource:
        input.method === PaymentMethod.CASH
          ? PaymentSettlementSource.CASH
          : undefined,
    });
    await this.paymentRepository.save(payment);

    // 4. Sincronizar PaymentOrder status según nueva proyección
    const allPaymentsResult = await this.paymentRepository.findByPaymentOrderId(
      order.getId().getValue()
    );
    const allPayments = allPaymentsResult.isSuccess
      ? allPaymentsResult.getValue()
      : [];
    const newSnapshot = PaymentOrderProjectionService.project(
      order.getTotalAmount(),
      allPayments
    );

    if (
      newSnapshot.coverageState === PaymentCoverageState.FULLY_PAID &&
      order.getStatus() !== PaymentOrderStatus.REFUND_PENDING
    ) {
      order.markAsCompleted();
      await this.paymentOrderRepository.update(order);
    } else if (
      newSnapshot.coverageState === PaymentCoverageState.PARTIALLY_PAID &&
      order.getStatus() === PaymentOrderStatus.PENDING
    ) {
      order.syncStatus(PaymentOrderStatus.PARTIAL);
      await this.paymentOrderRepository.update(order);
    }

    return Result.ok(payment.getId().getValue());
  }
}
