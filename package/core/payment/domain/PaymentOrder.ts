import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { PaymentOrderStatus } from "./PaymentOrderStatus";
import { Payment } from "./Payment";
import type { PaymentProps } from "./Payment";
import { PaymentMethod } from "./PaymentMethod";
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
  addPayment(payment: PaymentProps): Result<InvalidPaymentError, void> {
    if (this.status === PaymentOrderStatus.COMPLETED) {
      return Result.fail(new InvalidPaymentError("Payment order is already completed"));
    }
    if (!PaymentMethod[payment.method]) {
      return Result.fail(new InvalidPaymentError("Payment method is not valid"));
    }
    const currentPaymentAmount = PriceVO.add(
      this.payments.map((p) => p.getAmount())
    );
    const newPaymentAmount = PriceVO.add([
      currentPaymentAmount,
      new PriceVO(payment.amount),
    ]);
    const paymentGreaterThanTotal =
      newPaymentAmount.getValue() > this.totalAmount.getValue();
    const paymentCoversTotal =
      newPaymentAmount.getValue() >= this.totalAmount.getValue();
    const isCashPayment = payment.method === PaymentMethod.CASH;
    if (paymentGreaterThanTotal && !isCashPayment) {
      return Result.fail(new InvalidPaymentError("Non-cash payment exceeds total amount"));
    }
    if (paymentGreaterThanTotal && isCashPayment) {
      this.change = PriceVO.substract(newPaymentAmount, [this.totalAmount]);
    }
    const newPayment = Payment.create(payment);
    this.payments.push(newPayment);
    if (paymentCoversTotal) {
      this.status = PaymentOrderStatus.COMPLETED;
      this.completedAt = new Date();
    } else {
      this.status = PaymentOrderStatus.PARTIAL;
    }
    return Result.ok(undefined);
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
