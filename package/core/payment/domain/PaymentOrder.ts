import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PriceVO } from "../../shared/domain/Price.VO";
import { PaymentOrderStatus } from "./PaymentOrderStatus";
import { Payment } from "./Payment";
import type { PaymentProps } from "./Payment";
import { PaymentMethod } from "./PaymentMethod";

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
  addPayment(payment: PaymentProps) {
    const newAmount = PriceVO.add([
      this.totalAmount,
      new PriceVO(payment.amount),
    ]);
    if (
      PaymentMethod[payment.method] === PaymentMethod.CASH &&
      newAmount.getValue() > this.totalAmount.getValue()
    ) {
      this.change = PriceVO.substract([newAmount, this.totalAmount]);
    }
    if (newAmount.getValue() < this.totalAmount.getValue()) {
      throw new Error("Payment amount is less than total amount");
    }
    if (!PaymentMethod[payment.method]) {
      throw new Error("Payment method is not valid");
    }
    if(newAmount.getValue() === this.totalAmount.getValue()) {
      this.status = PaymentOrderStatus.COMPLETED;
      this.completedAt = new Date();
    }
    const newPayment = Payment.create(payment);
    this.payments.push(newPayment);
  }
  getChange() {
    return this.change;
  }
  getId() {
    return this.id;
  }
}
