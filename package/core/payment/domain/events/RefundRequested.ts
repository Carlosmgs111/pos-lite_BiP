import type { DomainEvent } from "../../../shared/domain/DomainEvent";
import { UuidVO } from "../../../shared/domain/Uuid.VO";

// 🛠️ FASE 4: Domain Events — Refund Lifecycle Events
// ! [ANTES] Solo existían PaymentOrderCompleted y PaymentOrderFailed — no había eventos para refunds
// ? [DESPUÉS] RefundRequested y RefundCompleted permiten trazabilidad completa del ciclo de devolución

export class RefundRequested implements DomainEvent<"payment.refund.requested"> {
  static eventName = "payment.refund.requested" as const;

  public readonly id: string;
  public readonly eventName = RefundRequested.eventName;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly payload: {
    refundPaymentId: string;
    originalPaymentId: string;
    saleId: string;
    amount: number;
  };

  constructor(props: {
    aggregateId: string;
    version: number;
    refundPaymentId: string;
    originalPaymentId: string;
    saleId: string;
    amount: number;
  }) {
    this.id = `${RefundRequested.eventName}-${props.aggregateId}-v${props.version}`;
    this.aggregateId = props.aggregateId;
    this.payload = {
      refundPaymentId: props.refundPaymentId,
      originalPaymentId: props.originalPaymentId,
      saleId: props.saleId,
      amount: props.amount,
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
  }): RefundRequested {
    return new RefundRequested(props);
  }
}
