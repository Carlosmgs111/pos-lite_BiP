import {
  addPayment,
  confirmPayment,
  processPayment,
  PaymentGatewayUnreachableError,
} from "../../../package/core/payment";
import { PaymentMethod } from "../../../package/core/payment";
import { UuidVO } from "../../../package/core/shared/domain/Uuid.VO";
import { $saleId } from "../stores/cart";
import { $paymentStatus, $payments, $change } from "../stores/payment";
import { showToast } from "../stores/toast";
import { EventListener } from "./EventListener";

const listener = new EventListener("/api/payment/events");

listener.on("payment.completed", (data) => {
  if (data.saleId !== $saleId.get()) return;
  $paymentStatus.set("completed");
  PaymentService.reconcile();
});

listener.on("payment.failed", (data) => {
  if (data.saleId !== $saleId.get()) return;
  $paymentStatus.set("failed");
  PaymentService.reconcile();
});

if (typeof window !== "undefined") {
  listener.connect();
}

if (typeof window !== "undefined") {
  listener.connect();
}

export const PaymentService = {
  async registerPayment(
    method: string,
    amount: number
  ): Promise<string | null> {
    const saleId = $saleId.get();
    if (!saleId) return null;

    const paymentId = UuidVO.generate();
    const paymentMethod = PaymentMethod[method as keyof typeof PaymentMethod];

    const result = await addPayment.execute(saleId, {
      id: paymentId,
      method: paymentMethod,
      amount,
    });

    if (!result.isSuccess) {
      showToast("No se pudo registrar el pago", "error");
      return null;
    }

    $payments.set([
      ...$payments.get(),
      { id: paymentId, method, amount, status: "pending" },
    ]);

    return paymentId;
  },

  async commitPayment(paymentId: string, success: boolean) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const result = await confirmPayment.execute(paymentId, success);
    if (!result.isSuccess) {
      showToast("Error al procesar el pago", "error");
      return;
    }
  },

  async processPayment(method: string, amount: number): Promise<void> {
    const paymentId = await this.registerPayment(method, amount);
    if (!paymentId) return;

    const paymentMethod = PaymentMethod[method as keyof typeof PaymentMethod];

    if (paymentMethod === PaymentMethod.CASH) {
      $paymentStatus.set("processing");
      await this.commitPayment(paymentId, true);
      return;
    }

    $paymentStatus.set("processing");

    const result = await processPayment.execute(paymentId, {
      paymentId,
      amount,
      method: paymentMethod,
    });

    if (!result.isSuccess) {
      const err = result.getError()!;
      if (err instanceof PaymentGatewayUnreachableError) {
        showToast("El procesador de pago no está disponible", "error");
      } else {
        showToast("Error inesperado al enviar el pago", "error");
      }
      $paymentStatus.set("awaiting_payment");
    }
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
