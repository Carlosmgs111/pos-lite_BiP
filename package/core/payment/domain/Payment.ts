import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";
import { PriceVO } from "../../shared/domain/Price.VO";

export type PaymentProps = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export class Payment {
  constructor(
    private id: UuidVO,
    private method: PaymentMethod,
    private amount: PriceVO,
    private status: PaymentStatus,
    private createdAt: Date,
    private externalReference?: string,
    private completedAt?: Date
  ) {}

  static create({ id, method, amount }: PaymentProps) {
    return new Payment(
      new UuidVO(id),
      method,
      new PriceVO(amount),
      PaymentStatus.PENDING,
      new Date()
    );
  }
  complete() {
    this.status = PaymentStatus.COMPLETED;
    this.completedAt = new Date();
  }
  fail() {
    this.status = PaymentStatus.FAILED;
  }
  getAmount() {
    return this.amount;
  }
  getMethod() {
    return this.method;
  }
  getExternalReference() {
    return this.externalReference;
  }
  getStatus() {
    return this.status;
  }
  getId() {
    return this.id;
  }
}
