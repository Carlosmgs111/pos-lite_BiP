import type { DomainEvent } from "../../../shared/domain/DomainEvent";
import { PaymentEventType } from "../../../../contracts/payment/PaymentEventTypes";

export class PaymentOrderFailed implements DomainEvent<PaymentEventType> {
  static readonly eventName = PaymentEventType.ORDER_FAILED;
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

    const id = `${PaymentOrderFailed.eventName}-${aggregateId}-v${version}`;

    return new PaymentOrderFailed(
      id,
      aggregateId,
      version,
      { saleId },
      new Date()
    );
  }
}
