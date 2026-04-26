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
  /** queryStatus exhausted its retry budget without ever observing a terminal status.
   *  Distinct from PENDING (gateway said "still processing") to let callers decide between
   *  "wait longer / reconcile later" and "alert + manual review". */
  TIMEOUT = "TIMEOUT",
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
