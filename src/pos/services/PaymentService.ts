import { $saleId } from "../stores/cart";
import {
  $paymentStatus,
  $payments,
  $change,
  type PaymentFlowStatus,
} from "../stores/payment";
import { showToast } from "../stores/toast";
import { EventListener } from "./EventListener";
import { PaymentEventType } from "../../../package/contracts/payment/PaymentEventTypes";

const listener = new EventListener("/api/payment/events");

let _initialized = false;
let _currentSaleId: string | null = null;
// ? 💡 Centraliza la suscripción a eventos de pago
function _listenToEvents(saleId: string) {
  listener.on(PaymentEventType.ORDER_COMPLETED, (data) => {
    if (data.saleId !== saleId) return;
    $paymentStatus.set("completed");
    PaymentService.reconcile(saleId);
  });

  listener.on(PaymentEventType.ORDER_FAILED, (data) => {
    if (data.saleId !== saleId) return;
    $paymentStatus.set("failed");
    PaymentService.reconcile(saleId);
  });

  listener.on(PaymentEventType.TRANSACTION_RESULT, (data) => {
    if (
      data.paymentId !==
      $payments.get().find((p) => p.id === data.paymentId)?.id
    )
      return;
    $payments.set(
      $payments
        .get()
        .map((p) =>
          p.id === data.paymentId
            ? { ...p, status: data.success ? "completed" : "failed" }
            : p
        )
    );
    $paymentStatus.set("awaiting_payment");
  });
}

export const PaymentService = {
  async init(saleId: string): Promise<void> {
    if (_initialized && _currentSaleId === saleId) return;

    if (_initialized) {
      listener.close();
    }

    _initialized = true;
    _currentSaleId = saleId;

    try {
      await this.reconcile(saleId);
    } catch {
      // Never block SSE subscription on reconcile failure
    }

    _listenToEvents(saleId);
    if (typeof window !== "undefined") {
      listener.connect();
    }
  },

  close() {
    listener.close();
    _initialized = false;
    _currentSaleId = null;
  },

  async registerPayment(
    saleId: string,
    paymentId: string,
    method: string,
    amount: number
  ): Promise<boolean> {
    const res = await fetch("/api/payment/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, paymentId, method, amount }),
    });

    if (!res.ok) {
      showToast("No se pudo registrar el pago", "error");
      return false;
    }

    $payments.set([
      ...$payments.get(),
      { id: paymentId, method, amount, status: "pending" },
    ]);

    return true;
  },

  async processPayment(method: string, amount: number): Promise<void> {
    const saleId = $saleId.get();
    if (!saleId) return;

    const paymentId = crypto.randomUUID();

    const registered = await this.registerPayment(
      saleId,
      paymentId,
      method,
      amount
    );
    if (!registered) return;

    if (method === "CASH") {
      $paymentStatus.set("processing");
      const res = await fetch("/api/payment/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, success: true }),
      });
      if (!res.ok) {
        showToast("Error al confirmar el pago", "error");
      } else {
        showToast("Pago confirmado", "success");
      }
      // await this.reconcile(saleId);
      return;
    }

    // Card/Transfer: fire-and-forget to gateway via server
    $paymentStatus.set("processing");

    const res = await fetch("/api/payment/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, method, amount }),
    });

    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({ error: "Error desconocido" }));
      showToast(data.error ?? "Error al enviar el pago", "error");
      $paymentStatus.set("awaiting_payment");
    }
    // SSE listener will handle the confirmation
  },

  async reconcilePendingPayments(): Promise<void> {
    const saleId = $saleId.get();
    if (!saleId) return;
    await fetch(`/api/payment/reconcile/by-sale-id/${saleId}`, { method: "POST" });
  },

  async reconcile(saleId: string): Promise<void> {
    try {
      const res = await fetch(`/api/payment/status?saleId=${saleId}`);
      if (!res.ok) return;

      const data = await res.json();

      $payments.set(
        data.payments.map((p: any) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          status:
            p.status === "COMPLETED"
              ? "completed"
              : p.status === "FAILED"
                ? "failed"
                : "pending",
        }))
      );

      $change.set(data.change);

      const statusMap: Record<string, string> = {
        PENDING: "awaiting_payment",
        PARTIAL: "partial",
        COMPLETED: "completed",
        FAILED: "failed",
        CANCELLED: "idle",
      };

      console.log(data.status);

      const mappedStatus = (statusMap[data.status] ??
        "idle") as PaymentFlowStatus;
      $paymentStatus.set(mappedStatus);

      if (data.status === "COMPLETED") {
        if (data.change > 0) {
          showToast(
            `Pago completado — Cambio: $${data.change.toFixed(2)}`,
            "success"
          );
        } else {
          showToast("Pago completado", "success");
        }
      } else if (data.status === "FAILED") {
        showToast("El pago ha fallado definitivamente", "error");
      }
    } catch {
      showToast("Error al consultar el estado del pago", "error");
    }
  },
};
