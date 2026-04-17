import type { DomainEvent } from "../../../shared/domain/DomaintEvent";

export class PaymentOrderCompleted implements DomainEvent<"payment.order.completed"> {
  static readonly eventName = "payment.order.completed" as const;
  readonly eventName = PaymentOrderCompleted.eventName;
  readonly occurredAt = new Date();
  constructor(public readonly payload: { saleId: string }) {}
}
