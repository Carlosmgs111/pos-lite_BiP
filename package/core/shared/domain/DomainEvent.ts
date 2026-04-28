export type EventMap = {
  "payment.order.completed": { saleId: string };
  "payment.order.failed": { saleId: string };
  "sales.ready.to.pay": { saleId: string; totalAmount: number };
  "payment.transaction.result": { paymentId: string; success: boolean };
};

export type EventName = keyof EventMap;

export interface DomainEvent<K extends EventName = EventName> {
  id: string;
  eventName: K;
  aggregateId: string;
  payload: EventMap[K];
  occurredAt: Date;
}
