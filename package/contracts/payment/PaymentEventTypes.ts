// 🛠️ FASE 17: Contracts — PaymentEventTypes expandido con refund lifecycle
// ! [ANTES] Solo ORDER_COMPLETED, ORDER_FAILED, TRANSACTION_RESULT
// ? [DESPUÉS] Agrega REFUND_REQUESTED y REFUND_COMPLETED para trazabilidad completa

export enum PaymentEventType {
  ORDER_COMPLETED = "payment.order.completed",
  ORDER_FAILED = "payment.order.failed",
  REFUND_REQUESTED = "payment.refund.requested",
  REFUND_COMPLETED = "payment.refund.completed",
  TRANSACTION_RESULT = "payment.transaction.result",
}

export interface PaymentOrderCompletedPayload {
  saleId: string;
}

export interface PaymentOrderFailedPayload {
  saleId: string;
}

export interface PaymentTransactionResultPayload {
  paymentId: string;
  success: boolean;
}

export interface PaymentRefundRequestedPayload {
  paymentId: string;
  reason: string;
}

export interface PaymentRefundCompletedPayload {
  paymentId: string;
  refundTransactionId: string;
}

export type PaymentEventPayloadMap = {
  [PaymentEventType.ORDER_COMPLETED]: PaymentOrderCompletedPayload;
  [PaymentEventType.ORDER_FAILED]: PaymentOrderFailedPayload;
  [PaymentEventType.TRANSACTION_RESULT]: PaymentTransactionResultPayload;
  [PaymentEventType.REFUND_REQUESTED]: PaymentRefundRequestedPayload;
  [PaymentEventType.REFUND_COMPLETED]: PaymentRefundCompletedPayload;
};
