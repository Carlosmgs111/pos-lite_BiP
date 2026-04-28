import type { DomainEvent } from "../../../shared/domain/DomainEvent";

export class PaymentOrderFailed implements DomainEvent<"payment.order.failed"> {
  static readonly eventName = "payment.order.failed";
  readonly eventName = PaymentOrderFailed.eventName;
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
  }): PaymentOrderFailed {
    const { aggregateId, version, saleId } = params;

    const id = `payment.order.failed-${aggregateId}-v${version}`;

    return new PaymentOrderFailed(
      id,
      aggregateId,
      version,
      { saleId },
      new Date()
    );
  }
}
