import type { DomainEvent } from "../../../shared/domain/DomainEvent";

export class SalesReadyToPay implements DomainEvent<"sales.ready.to.pay"> {
  static readonly eventName = "sales.ready.to.pay";
  readonly eventName = SalesReadyToPay.eventName;

  private constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly payload: { saleId: string; totalAmount: number },
    public readonly occurredAt: Date
  ) {}

  static create(params: {
    aggregateId: string;
    version: number;
    saleId: string;
    totalAmount: number;
  }): SalesReadyToPay {
    const { aggregateId, version, saleId, totalAmount } = params;

    const id = `sales.ready.to.pay-${aggregateId}-v${version}`;

    return new SalesReadyToPay(
      id,
      aggregateId,
      version,
      { saleId, totalAmount },
      new Date()
    );
  }
}
