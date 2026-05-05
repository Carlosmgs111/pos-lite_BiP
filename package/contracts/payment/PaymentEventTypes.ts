export const PaymentEventType = {
  ORDER_COMPLETED: "payment.order.completed",
  ORDER_FAILED: "payment.order.failed",
  TRANSACTION_RESULT: "payment.transaction.result",
} as const;

export type PaymentEventType = (typeof PaymentEventType)[keyof typeof PaymentEventType];

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

export type PaymentEventPayloadMap = {
  [PaymentEventType.ORDER_COMPLETED]: PaymentOrderCompletedPayload;
  [PaymentEventType.ORDER_FAILED]: PaymentOrderFailedPayload;
  [PaymentEventType.TRANSACTION_RESULT]: PaymentTransactionResultPayload;
};
