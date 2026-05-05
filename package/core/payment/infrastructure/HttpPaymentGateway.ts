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
  private readonly baseUrl: string;
  private readonly authHeaders: Record<string, string>;

  constructor(baseUrl: string, authHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authHeaders = authHeaders;
  }

  private buildHeaders(extra: Record<string, string>): Record<string, string> {
    return { ...this.authHeaders, ...extra };
  }

  async requestPayment(request: PaymentRequest): Promise<string> {
    let res: Response;
    try {
      res = await fetch(new URL("/process-payment", this.baseUrl).href, {
        method: "POST",
        headers: this.buildHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          amount: request.amount,
          currency: "USD",
          method: request.method,
          metadata: { payment_id: request.paymentId },
        }),
      });
    } catch (e) {
      throw new PaymentGatewayUnreachableError(e);
    }

    if (!res.ok) {
      throw new PaymentGatewayUnreachableError(
        new Error(`Gateway responded with status ${res.status}: ${res.statusText}`)
      );
    }

    const data: ProcessPaymentResponse = await res.json();
    return data.transaction_id;
  }

  async queryStatus(transactionId: string): Promise<GatewayTransactionStatus> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_INTERVALS_MS.length; attempt++) {
      try {
        const res = await fetch(
          new URL(`/transaction?id=${transactionId}`, this.baseUrl).href,
          { headers: this.authHeaders }
        );

        if (res.status === 404) return GatewayTransactionStatus.NOT_FOUND;
        if (!res.ok) {
          throw new PaymentGatewayUnreachableError(
            new Error(`Gateway responded with status ${res.status}: ${res.statusText}`)
          );
        }

        const data: TransactionResponse = await res.json();
        if (data.status === "SUCCEEDED")
          return GatewayTransactionStatus.SUCCEEDED;
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

    // Retries exhausted. If the last attempt errored, propagate; otherwise the gateway
    // kept replying PROCESSING — return TIMEOUT (distinct from PENDING) so the caller can
    // reconcile later or alert.
    if (lastError) throw lastError;
    return GatewayTransactionStatus.TIMEOUT;
  }
}
