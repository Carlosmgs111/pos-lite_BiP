import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";
import { PriceVO } from "../../shared/domain/Price.VO";

export type PaymentProps = {
    method: PaymentMethod;
    amount: number;
}

export class Payment {
  constructor(
    private id: UuidVO,
    private method: PaymentMethod,
    private amount: PriceVO,
    private status: PaymentStatus,
    private createdAt: Date
  ) {}

  static create({
    method,
    amount,
  }: {
    method: PaymentMethod;
    amount: number;
  }) {
    return new Payment(
      new UuidVO(UuidVO.generate()),
      method,
      new PriceVO(amount),
      PaymentStatus.PENDING,
      new Date()
    );
  }
  getAmount() {
    return this.amount;
  }

}
