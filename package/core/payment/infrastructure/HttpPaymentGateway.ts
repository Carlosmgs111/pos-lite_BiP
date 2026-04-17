import {
  type PaymentGateway,
  type PaymentRequest,
  GatewayTransactionStatus,
} from "../domain/PaymentGateway";
import { PaymentGatewayUnreachableError } from "./Errors/PaymentGatewayError";

interface ProcessPaymentResponse {
  transaction_id: string;
  status: string;
}

interface TransactionResponse {
  transaction_id: string;
  status: "PROCESSING" | "SUCCEEDED" | "FAILED";
}

const RETRY_INTERVALS_MS = [500, 1000, 2000, 4000, 8000];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpPaymentGateway implements PaymentGateway {
  constructor(private baseUrl: string) {}

  async requestPayment(request: PaymentRequest): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: request.amount,
          currency: "USD",
          method: request.method,
          metadata: { payment_id: request.paymentId },
        }),
      });
    } catch {
      throw new PaymentGatewayUnreachableError();
    }

    if (!res.ok) throw new PaymentGatewayUnreachableError();

    const data: ProcessPaymentResponse = await res.json();
    return data.transaction_id;
  }

  async queryStatus(transactionId: string): Promise<GatewayTransactionStatus> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_INTERVALS_MS.length; attempt++) {
      try {
        const res = await fetch(
          `${this.baseUrl}/transaction?id=${transactionId}`
        );

        if (res.status === 404) return GatewayTransactionStatus.NOT_FOUND;
        if (!res.ok) throw new PaymentGatewayUnreachableError();

        const data: TransactionResponse = await res.json();
        if (data.status === "SUCCEEDED") return GatewayTransactionStatus.SUCCEEDED;
        if (data.status === "FAILED") return GatewayTransactionStatus.FAILED;

        // PENDING — wait and retry
        lastError = null;
      } catch (err) {
        lastError = err as Error;
      }

      if (attempt < RETRY_INTERVALS_MS.length - 1) {
        await delay(RETRY_INTERVALS_MS[attempt]);
      }
    }

    if (lastError) throw lastError;
    return GatewayTransactionStatus.PENDING;
  }
}
