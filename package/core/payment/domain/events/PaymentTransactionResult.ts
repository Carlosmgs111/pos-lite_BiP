import type { DomainEvent } from "../../../shared/domain/DomainEvent";

export class PaymentTransactionResult implements DomainEvent<"payment.transaction.result"> {
  static readonly eventName = "payment.transaction.result";
  readonly eventName = PaymentTransactionResult.eventName;
  constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly payload: { paymentId: string; success: boolean },
    public readonly occurredAt: Date
  ) {}
  static create(params: {
    aggregateId: string;
    version: number;
    paymentId: string;
    success: boolean;
  }): PaymentTransactionResult {
    const { aggregateId, version, paymentId, success } = params;

    const id = `payment.transaction.result-${aggregateId}-v${version}`;

    return new PaymentTransactionResult(
      id,
      aggregateId,
      version,
      { paymentId, success },
      new Date()
    );
  }
}
