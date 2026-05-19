// 🛠️ FASE 2: Domain PaymentOrder — Workflow Aggregate Puro
// ! [ANTES] PaymentOrder tenía campos contables persistidos (paidAmount, pendingAmount, failedAttempts, change) y métodos incrementales que causaban drift financiero
// ? [DESPUÉS] PaymentOrder es workflow puro: solo status, totalAmount, saleId. Los montos se derivan de Payments via ProjectionService

import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { PaymentMethod } from "./Payment";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

export enum PaymentOrderStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  COMPLETED = "COMPLETED",
  REFUND_PENDING = "REFUND_PENDING",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export class PaymentOrder {
  private constructor(
    private id: UuidVO,
    private saleId: UuidVO,
    private totalAmount: PriceVO,
    private status: PaymentOrderStatus,
    private version: number,
    private createdAt: Date,
    private completedAt?: Date
  ) {}

  static create({
    saleId,
    totalAmount,
  }: {
    saleId: string;
    totalAmount: number;
  }): Result<InvalidPaymentError, PaymentOrder> {
    if (totalAmount <= 0) {
      return Result.fail(
        new InvalidPaymentError("Total amount must be greater than zero")
      );
    }
    return Result.ok(
      new PaymentOrder(
        new UuidVO(UuidVO.generate()),
        new UuidVO(saleId),
        new PriceVO(totalAmount),
        PaymentOrderStatus.PENDING,
        0,
        new Date()
      )
    );
  }

  static reconstitute(props: {
    id: string;
    saleId: string;
    totalAmount: number;
    status: PaymentOrderStatus;
    version: number;
    createdAt: Date;
    completedAt?: Date;
  }): PaymentOrder {
    return new PaymentOrder(
      new UuidVO(props.id),
      new UuidVO(props.saleId),
      new PriceVO(props.totalAmount),
      props.status,
      props.version,
      new Date(props.createdAt),
      props.completedAt ? new Date(props.completedAt) : undefined
    );
  }

  /** PaymentOrder decides if a new payment can be accepted. */
  assertCanAcceptPayment(
    amount: number,
    method: PaymentMethod
  ): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot add payment to a terminal order")
      );
    }
    if (!Object.values(PaymentMethod).includes(method)) {
      return Result.fail(
        new InvalidPaymentError("Payment method is not valid")
      );
    }
    if (amount <= 0) {
      return Result.fail(
        new InvalidPaymentError("Payment amount must be greater than zero")
      );
    }
    // Non-cash validation: amount must not exceed total (caller should use projection for remaining)
    if (method !== PaymentMethod.CASH && amount > this.totalAmount.getValue()) {
      return Result.fail(
        new InvalidPaymentError("Non-cash payment exceeds total amount")
      );
    }
    return Result.ok(undefined);
  }

  markAsCompleted(): Result<InvalidPaymentError, void> {
    if (this.status === PaymentOrderStatus.COMPLETED) {
      return Result.ok(undefined); // idempotent
    }
    if (this.status === PaymentOrderStatus.FAILED || this.status === PaymentOrderStatus.CANCELLED) {
      return Result.fail(
        new InvalidPaymentError("Cannot complete a terminal order")
      );
    }
    this.status = PaymentOrderStatus.COMPLETED;
    this.completedAt = new Date();
    this.version++;
    return Result.ok(undefined);
  }

  markAsFailed(): Result<InvalidPaymentError, void> {
    if (this.status === PaymentOrderStatus.FAILED) {
      return Result.ok(undefined); // idempotent
    }
    if (this.status === PaymentOrderStatus.CANCELLED) {
      return Result.fail(
        new InvalidPaymentError("Cannot fail a cancelled order")
      );
    }
    this.status = PaymentOrderStatus.FAILED;
    this.version++;
    return Result.ok(undefined);
  }

  markAsRefundPending(): Result<InvalidPaymentError, void> {
    if (this.status === PaymentOrderStatus.REFUND_PENDING) {
      return Result.ok(undefined); // idempotent
    }
    if (this.status === PaymentOrderStatus.FAILED || this.status === PaymentOrderStatus.CANCELLED) {
      return Result.fail(
        new InvalidPaymentError("Cannot mark a terminal order as refund pending")
      );
    }
    this.status = PaymentOrderStatus.REFUND_PENDING;
    this.version++;
    return Result.ok(undefined);
  }

  cancel(): Result<InvalidPaymentError, void> {
    if (this.status === PaymentOrderStatus.CANCELLED) {
      return Result.ok(undefined); // idempotent
    }
    if (this.status === PaymentOrderStatus.FAILED) {
      return Result.fail(
        new InvalidPaymentError("Cannot cancel a failed order")
      );
    }
    this.status = PaymentOrderStatus.CANCELLED;
    this.version++;
    return Result.ok(undefined);
  }

  syncStatus(newStatus: PaymentOrderStatus): Result<InvalidPaymentError, void> {
    if (this.status === newStatus) return Result.ok(undefined);
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot sync status on a terminal order")
      );
    }
    // Only allow transitions to non-terminal states
    if (newStatus === PaymentOrderStatus.FAILED || newStatus === PaymentOrderStatus.CANCELLED) {
      return Result.fail(
        new InvalidPaymentError("Use explicit markAsFailed() or cancel() for terminal states")
      );
    }
    this.status = newStatus;
    this.version++;
    return Result.ok(undefined);
  }

  isTerminal(): boolean {
    return (
      this.status === PaymentOrderStatus.FAILED ||
      this.status === PaymentOrderStatus.CANCELLED
    );
  }

  getVersion() {
    return this.version;
  }
  getStatus() {
    return this.status;
  }
  getTotalAmount() {
    return this.totalAmount;
  }
  getSaleId() {
    return this.saleId;
  }
  getId() {
    return this.id;
  }
  getCreatedAt() {
    return this.createdAt;
  }
  getCompletedAt() {
    return this.completedAt;
  }
}
