import type { DomainEvent } from "../../../shared/domain/DomainEvent";
import { PaymentEventType } from "../../../../contracts/payment/PaymentEventTypes";

export class PaymentOrderCompleted implements DomainEvent<PaymentEventType> {
  static readonly eventName = PaymentEventType.ORDER_COMPLETED;
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

    const id = `${PaymentOrderCompleted.eventName}-${aggregateId}-v${version}`;

    return new PaymentOrderCompleted(
      id,
      aggregateId,
      version,
      { saleId },
      new Date()
    );
  }
}
