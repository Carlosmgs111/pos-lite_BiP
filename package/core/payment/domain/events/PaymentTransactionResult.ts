import type { DomainEvent } from "../../../shared/domain/DomaintEvent";

export class PaymentTransactionResult implements DomainEvent<"payment.transaction.result"> {
  static readonly eventName = "payment.transaction.result" as const;
  readonly eventName = PaymentTransactionResult.eventName;
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: { paymentId: string; success: boolean }
  ) {}
}
