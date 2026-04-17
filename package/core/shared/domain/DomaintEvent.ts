export type EventMap = {
  "payment.order.completed": { saleId: string };
  "payment.order.failed": { saleId: string };
  "sales.ready.to.pay": { saleId: string; totalAmount: number };
};

export type EventName = keyof EventMap;

export interface DomainEvent<K extends EventName = EventName> {
  eventName: K;
  payload: EventMap[K];
  occurredAt: Date;
}
