import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

export type PaymentProps = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export class Payment {
  private constructor(
    private id: UuidVO,
    private method: PaymentMethod,
    private amount: PriceVO,
    private status: PaymentStatus,
    private createdAt: Date,
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
  complete(): Result<InvalidPaymentError, void> {
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(new InvalidPaymentError("Can only complete a pending payment"));
    }
    this.status = PaymentStatus.COMPLETED;
    this.completedAt = new Date();
    return Result.ok(undefined);
  }
  fail(): Result<InvalidPaymentError, void> {
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(new InvalidPaymentError("Can only fail a pending payment"));
    }
    this.status = PaymentStatus.FAILED;
    return Result.ok(undefined);
  }
  getAmount() {
    return this.amount;
  }
  getMethod() {
    return this.method;
  }
  getStatus() {
    return this.status;
  }
  getId() {
    return this.id;
  }
}
