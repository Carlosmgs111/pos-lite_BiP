import type { DomainEvent } from "../../../shared/domain/DomaintEvent";

export class PaymentOrderFailed implements DomainEvent<"payment.order.failed"> {
  static readonly eventName = "payment.order.failed" as const;
  readonly eventName = PaymentOrderFailed.eventName;
  readonly occurredAt = new Date();
  constructor(public readonly payload: { saleId: string }) {}
}
