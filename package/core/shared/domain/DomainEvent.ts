// 🛠️ FASE 4: Domain Events — EventMap expandido con refund lifecycle
// ! [ANTES] EventMap solo tenía eventos de PaymentOrder y Sales — sin trazabilidad de refunds
// ? [DESPUÉS] payment.refund.requested y payment.refund.completed para auditoría completa de devoluciones
export type EventMap = {
  "payment.order.completed": { saleId: string };
  "payment.order.failed": { saleId: string };
  "payment.refund.requested": { refundPaymentId: string; originalPaymentId: string; saleId: string; amount: number };
  "payment.refund.completed": { refundPaymentId: string; originalPaymentId: string; saleId: string; amount: number; settlementSource: string };
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
