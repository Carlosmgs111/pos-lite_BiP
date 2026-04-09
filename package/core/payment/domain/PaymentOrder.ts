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
  }) {
    return new PaymentOrder(
      new UuidVO(UuidVO.generate()),
      new UuidVO(saleId),
      new PriceVO(totalAmount),
      [],
      PaymentOrderStatus.PENDING,
      new Date()
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

    if (!covered) {
      this.status = PaymentOrderStatus.PENDING;
      this.completedAt = undefined;
      this.change = new PriceVO(0);
      return;
    }

    if (coverage.getValue() > this.totalAmount.getValue()) {
      this.change = PriceVO.substract(coverage, [this.totalAmount]);
    } 
    // else {
    //   this.change = new PriceVO(0);
    // }

    if (this.allNonFailedPaymentsCompleted()) {
      this.status = PaymentOrderStatus.COMPLETED;
      this.completedAt = new Date();
    } else {
      this.status = PaymentOrderStatus.PARTIAL;
    }
  }
  addPayment(payment: PaymentProps): Result<InvalidPaymentError, Payment> {
    if (this.status === PaymentOrderStatus.COMPLETED) {
      return Result.fail(
        new InvalidPaymentError("Payment order is already completed")
      );
    }
    if (!PaymentMethod[payment.method]) {
      return Result.fail(
        new InvalidPaymentError("Payment method is not valid")
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
    const payment = this.payments.find(
      (p) => p.getId().getValue() === paymentId
    );
    if (!payment) {
      return Result.fail(new InvalidPaymentError("Payment not found"));
    }
    if (payment.getStatus() !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError(
          "Can only register result for a pending payment"
        )
      );
    }
    if (success) {
      payment.complete();
    } else {
      payment.fail();
    }
    this.recalculateStatus();
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
