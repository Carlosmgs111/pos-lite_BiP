import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { PaymentOrderStatus } from "./PaymentOrderStatus";
import { Payment } from "./Payment";
import type { PaymentProps } from "./Payment";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

export class PaymentOrder {
  private change: PriceVO = new PriceVO(0);
  private constructor(
    private id: UuidVO,
    private saleId: UuidVO,
    private totalAmount: PriceVO,
    private payments: Payment[],
    private status: PaymentOrderStatus,
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
      return Result.fail(new InvalidPaymentError("Total amount must be greater than zero"));
    }
    return Result.ok(
      new PaymentOrder(
        new UuidVO(UuidVO.generate()),
        new UuidVO(saleId),
        new PriceVO(totalAmount),
        [],
        PaymentOrderStatus.PENDING,
        new Date()
      )
    );
  }
  private isTerminal(): boolean {
    return (
      this.status === PaymentOrderStatus.COMPLETED ||
      this.status === PaymentOrderStatus.FAILED ||
      this.status === PaymentOrderStatus.CANCELLED
    );
  }
  private getNonFailedCoverage(): PriceVO {
    const nonFailed = this.payments.filter(
      (p) => p.getStatus() !== PaymentStatus.FAILED
    );
    return PriceVO.add(nonFailed.map((p) => p.getAmount()));
  }
  private allNonFailedPaymentsCompleted(): boolean {
    const nonFailed = this.payments.filter(
      (p) => p.getStatus() !== PaymentStatus.FAILED
    );
    return (
      nonFailed.length > 0 &&
      nonFailed.every((p) => p.getStatus() === PaymentStatus.COMPLETED)
    );
  }
  private recalculateStatus(): void {
    const coverage = this.getNonFailedCoverage();
    const covered = coverage.getValue() >= this.totalAmount.getValue();
    this.change = new PriceVO(0);

    if (!covered) {
      this.status = PaymentOrderStatus.PENDING;
      this.completedAt = undefined;
      return;
    }

    if (coverage.getValue() > this.totalAmount.getValue()) {
      this.change = PriceVO.substract(coverage, [this.totalAmount]);
    }

    if (this.allNonFailedPaymentsCompleted()) {
      this.status = PaymentOrderStatus.COMPLETED;
      this.completedAt = new Date();
    } else {
      this.status = PaymentOrderStatus.PARTIAL;
    }
  }
  addPayment(payment: PaymentProps): Result<InvalidPaymentError, Payment> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot add payment to a terminal order")
      );
    }
    if (!PaymentMethod[payment.method]) {
      return Result.fail(
        new InvalidPaymentError("Payment method is not valid")
      );
    }
    if (payment.amount <= 0) {
      return Result.fail(
        new InvalidPaymentError("Payment amount must be greater than zero")
      );
    }

    const currentCoverage = this.getNonFailedCoverage();
    const projectedCoverage = PriceVO.add([
      currentCoverage,
      new PriceVO(payment.amount),
    ]);
    const exceedsTotal =
      projectedCoverage.getValue() > this.totalAmount.getValue();
    const isCashPayment = payment.method === PaymentMethod.CASH;

    if (exceedsTotal && !isCashPayment) {
      return Result.fail(
        new InvalidPaymentError("Non-cash payment exceeds total amount")
      );
    }

    const newPayment = Payment.create(payment);
    this.payments.push(newPayment);
    this.recalculateStatus();
    return Result.ok(newPayment);
  }
  registerPayment(
    paymentId: string,
    success: boolean
  ): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot register payment on a terminal order")
      );
    }
    const payment = this.payments.find(
      (p) => p.getId().getValue() === paymentId
    );
    if (!payment) {
      return Result.fail(new InvalidPaymentError("Payment not found"));
    }
    const transitionResult = success ? payment.complete() : payment.fail();
    if (!transitionResult.isSuccess) {
      return Result.fail(transitionResult.getError());
    }
    this.recalculateStatus();
    return Result.ok(undefined);
  }
  cancel(): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot cancel a terminal payment order")
      );
    }
    this.status = PaymentOrderStatus.CANCELLED;
    return Result.ok(undefined);
  }
  markAsFailed(): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot mark a terminal payment order as failed")
      );
    }
    this.status = PaymentOrderStatus.FAILED;
    return Result.ok(undefined);
  }
  getFailedPaymentCount(): number {
    return this.payments.filter((p) => p.getStatus() === PaymentStatus.FAILED)
      .length;
  }
  getPayments(): readonly Payment[] {
    return this.payments;
  }
  hasPayment(paymentId: string): boolean {
    return this.payments.some((p) => p.getId().getValue() === paymentId);
  }
  getChange() {
    return this.change;
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
}
