import type { DomainEvent } from "../../../shared/domain/DomainEvent";

export class PaymentOrderCompleted implements DomainEvent<"payment.order.completed"> {
  static readonly eventName = "payment.order.completed";
  readonly eventName = PaymentOrderCompleted.eventName;
  constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly payload: { saleId: string },
    public readonly occurredAt: Date
  ) {}
  static create(params: {
    aggregateId: string;
    version: number;
    saleId: string;
  }): PaymentOrderCompleted {
    const { aggregateId, version, saleId } = params;

    const id = `payment.order.completed-${aggregateId}-v${version}`;

    return new PaymentOrderCompleted(
      id,
      aggregateId,
      version,
      { saleId },
      new Date()
    );
  }
}
