import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { PaymentOrderStatus } from "./PaymentOrderStatus";
import { PaymentMethod } from "./PaymentMethod";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

export class PaymentOrder {
  private constructor(
    private id: UuidVO,
    private saleId: UuidVO,
    private totalAmount: PriceVO,
    private paidAmount: PriceVO,
    private pendingAmount: PriceVO,
    private failedAttempts: number,
    private change: PriceVO,
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
        new PriceVO(0),
        new PriceVO(0),
        0,
        new PriceVO(0),
        PaymentOrderStatus.PENDING,
        0,
        new Date()
      )
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
    if (!PaymentMethod[method]) {
      return Result.fail(
        new InvalidPaymentError("Payment method is not valid")
      );
    }
    if (amount <= 0) {
      return Result.fail(
        new InvalidPaymentError("Payment amount must be greater than zero")
      );
    }

    const currentCoverage = PriceVO.add([this.paidAmount, this.pendingAmount]);
    const projectedCoverage = PriceVO.add([currentCoverage, new PriceVO(amount)]);
    const exceedsTotal =
      projectedCoverage.getValue() > this.totalAmount.getValue();

    if (exceedsTotal && method !== PaymentMethod.CASH) {
      return Result.fail(
        new InvalidPaymentError("Non-cash payment exceeds total amount")
      );
    }

    return Result.ok(undefined);
  }

  /** Called when a new Payment is created and linked to this order. */
  registerPendingPayment(amount: number): void {
    this.pendingAmount = PriceVO.add([this.pendingAmount, new PriceVO(amount)]);
    if (
      PriceVO.add([this.paidAmount, this.pendingAmount]).getValue() >=
      this.totalAmount.getValue()
    ) {
      this.status = PaymentOrderStatus.PARTIAL;
    }
    this.version++;
  }

  /** Called when a Payment is confirmed as successful. */
  applyPayment(amount: number): void {
    this.paidAmount = PriceVO.add([this.paidAmount, new PriceVO(amount)]);
    this.pendingAmount = PriceVO.substract(this.pendingAmount, [
      new PriceVO(amount),
    ]);

    if (this.paidAmount.getValue() >= this.totalAmount.getValue()) {
      this.status = PaymentOrderStatus.COMPLETED;
      this.completedAt = new Date();
      if (this.paidAmount.getValue() > this.totalAmount.getValue()) {
        this.change = PriceVO.substract(this.paidAmount, [this.totalAmount]);
      }
    }
    this.version++;
  }

  /** Called when a Payment fails. */
  registerFailedAttempt(amount: number): void {
    this.failedAttempts++;
    this.pendingAmount = PriceVO.substract(this.pendingAmount, [
      new PriceVO(amount),
    ]);

    // Recalculate: if no pending coverage remains, revert to PENDING
    const coverage = PriceVO.add([this.paidAmount, this.pendingAmount]);
    if (coverage.getValue() < this.totalAmount.getValue()) {
      this.status = PaymentOrderStatus.PENDING;
    }
    this.version++;
  }

  markAsFailed(): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError(
          "Cannot mark a terminal payment order as failed"
        )
      );
    }
    this.status = PaymentOrderStatus.FAILED;
    this.version++;
    return Result.ok(undefined);
  }

  cancel(): Result<InvalidPaymentError, void> {
    if (this.isTerminal()) {
      return Result.fail(
        new InvalidPaymentError("Cannot cancel a terminal payment order")
      );
    }
    this.status = PaymentOrderStatus.CANCELLED;
    this.version++;
    return Result.ok(undefined);
  }

  isTerminal(): boolean {
    return (
      this.status === PaymentOrderStatus.COMPLETED ||
      this.status === PaymentOrderStatus.FAILED ||
      this.status === PaymentOrderStatus.CANCELLED
    );
  }

  getVersion() {
    return this.version;
  }
  getFailedAttempts() {
    return this.failedAttempts;
  }
  getPaidAmount() {
    return this.paidAmount;
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
