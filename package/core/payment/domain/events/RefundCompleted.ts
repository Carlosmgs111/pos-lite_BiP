import type { DomainEvent } from "../../../shared/domain/DomainEvent";

// 🛠️ FASE 4: Domain Events — Refund Lifecycle Events (continued)
// ! [ANTES] No había evento para refunds completados
// ? [DESPUÉS] RefundCompleted permite notificar cuando la restitución económica se efectivizó

export class RefundCompleted implements DomainEvent<"payment.refund.completed"> {
  static eventName = "payment.refund.completed" as const;

  public readonly id: string;
  public readonly eventName = RefundCompleted.eventName;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly payload: {
    refundPaymentId: string;
    originalPaymentId: string;
    saleId: string;
    amount: number;
    settlementSource: string;
  };

  constructor(props: {
    aggregateId: string;
    version: number;
    refundPaymentId: string;
    originalPaymentId: string;
    saleId: string;
    amount: number;
    settlementSource: string;
  }) {
    this.id = `${RefundCompleted.eventName}-${props.aggregateId}-v${props.version}`;
    this.aggregateId = props.aggregateId;
    this.payload = {
      refundPaymentId: props.refundPaymentId,
      originalPaymentId: props.originalPaymentId,
      saleId: props.saleId,
      amount: props.amount,
      settlementSource: props.settlementSource,
    };
    this.occurredAt = new Date();
  }

  static create(props: {
    aggregateId: string;
    version: number;
    refundPaymentId: string;
    originalPaymentId: string;
    saleId: string;
    amount: number;
    settlementSource: string;
  }): RefundCompleted {
    return new RefundCompleted(props);
  }
}
