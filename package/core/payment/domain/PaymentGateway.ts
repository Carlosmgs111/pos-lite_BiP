import type { PaymentMethod } from "./PaymentMethod";

export interface PaymentRequest {
  paymentId: string;
  amount: number;
  method: PaymentMethod;
}

export enum GatewayTransactionStatus {
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  NOT_FOUND = "NOT_FOUND",
}

export interface WebhookEvent {
  transactionId: string;
  success: boolean;
}
export interface PaymentGateway {
  requestPayment(request: PaymentRequest): Promise<string>;
  queryStatus(transactionId: string): Promise<GatewayTransactionStatus>;
}
