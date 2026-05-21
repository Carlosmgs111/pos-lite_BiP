import { PaymentMethod } from "./Payment";
import { Result } from "../../shared/domain/Result";

export interface PaymentRequest {
  paymentId: string;
  amount: number;
  method: PaymentMethod;
}

export enum GatewayTransactionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DECLINED = "DECLINED",
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
  requestPayment(request: PaymentRequest): Promise<Result<Error, string>>;
  queryStatus(transactionId: string): Promise<Result<Error, GatewayTransactionStatus>>;
}
