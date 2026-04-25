import { UuidVO } from "../../shared/domain/Uuid.VO";
import { PaymentMethod } from "./PaymentMethod";
import { PaymentStatus } from "./PaymentStatus";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import { InvalidPaymentError } from "./Errors/InvalidPaymentError";

export type PaymentProps = {
  id: string;
  paymentOrderId: string;
  method: PaymentMethod;
  amount: number;
};

export class Payment {
  private constructor(
    private id: UuidVO,
    private paymentOrderId: string,
    private method: PaymentMethod,
    private amount: PriceVO,
    private status: PaymentStatus,
    private version: number,
    private createdAt: Date,
    private externalId?: string,
    private completedAt?: Date
  ) {}

  static create({ id, paymentOrderId, method, amount }: PaymentProps) {
    return new Payment(
      new UuidVO(id),
      paymentOrderId,
      method,
      new PriceVO(amount),
      PaymentStatus.PENDING,
      0,
      new Date()
    );
  }

  complete(): Result<InvalidPaymentError, void> {
    if (this.method !== PaymentMethod.CASH && !this.externalId) {
      return Result.fail(
        new InvalidPaymentError(
          "Only cash payments can be completed without an external ID"
        )
      );
    }
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only complete a pending payment")
      );
    }
    this.status = PaymentStatus.COMPLETED;
    this.completedAt = new Date();
    this.version++;
    return Result.ok(undefined);
  }

  processing(externalId: string): Result<InvalidPaymentError, void> {
    if (this.method === PaymentMethod.CASH) {
      return Result.fail(
        new InvalidPaymentError(
          "Only card and transfer payments can be processed"
        )
      );
    }
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only process a pending payment")
      );
    }
    this.externalId = externalId;
    this.version++;
    return Result.ok(undefined);
  }

  fail(): Result<InvalidPaymentError, void> {
    if (this.status !== PaymentStatus.PENDING) {
      return Result.fail(
        new InvalidPaymentError("Can only fail a pending payment")
      );
    }
    this.status = PaymentStatus.FAILED;
    this.version++;
    return Result.ok(undefined);
  }

  getVersion() {
    return this.version;
  }
  getPaymentOrderId() {
    return this.paymentOrderId;
  }
  getExternalId() {
    return this.externalId;
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
