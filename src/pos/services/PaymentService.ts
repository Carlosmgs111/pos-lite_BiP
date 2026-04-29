import { $saleId } from "../stores/cart";
import { $paymentStatus, $payments, $change } from "../stores/payment";
import { showToast } from "../stores/toast";
import { EventListener } from "./EventListener";

const listener = new EventListener("/api/payment/events");

listener.on("payment.order.completed", (data) => {
  if (data.saleId !== $saleId.get()) return;
  $paymentStatus.set("completed");
  PaymentService.reconcile();
});

listener.on("payment.order.failed", (data) => {
  if (data.saleId !== $saleId.get()) return;
  $paymentStatus.set("failed");
  PaymentService.reconcile();
});

listener.on("payment.transaction.result", (data) => {
  if (
    data.paymentId !== $payments.get().find((p) => p.id === data.paymentId)?.id
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

if (typeof window !== "undefined") {
  listener.connect();
}

export const PaymentService = {
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
      }else{
        showToast("Pago confirmado", "success");
      }
      await this.reconcile();
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

  async reconcile(): Promise<void> {
    const saleId = $saleId.get();
    if (!saleId) return;

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

      if (data.status === "COMPLETED") {
        $paymentStatus.set("completed");
        if (data.change > 0) {
          showToast(
            `Pago completado — Cambio: $${data.change.toFixed(2)}`,
            "success"
          );
        } else {
          showToast("Pago completado", "success");
        }
      } else if (data.status === "FAILED") {
        $paymentStatus.set("failed");
        showToast("El pago ha fallado definitivamente", "error");
      }
    } catch {
      showToast("Error al consultar el estado del pago", "error");
    }
  },
};
