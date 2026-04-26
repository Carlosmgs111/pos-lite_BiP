import type { DomainEvent } from "../../../shared/domain/DomainEvent";

export class SalesReadyToPay implements DomainEvent<"sales.ready.to.pay"> {
  static readonly eventName = "sales.ready.to.pay" as const;
  readonly eventName = SalesReadyToPay.eventName;
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: { saleId: string; totalAmount: number }
  ) {}
}
