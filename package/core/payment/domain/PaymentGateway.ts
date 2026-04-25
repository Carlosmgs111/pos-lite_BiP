import { PaymentMethod } from "./Payment";

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

export interface ExternalPaymentPayload {
  transactionId: string;
  success: boolean;
}
export interface ExternalPaymentEvent {
  provider: string;
  payload: ExternalPaymentPayload;
}
export interface PaymentGateway {
  requestPayment(request: PaymentRequest): Promise<string>;
  queryStatus(transactionId: string): Promise<GatewayTransactionStatus>;
}
