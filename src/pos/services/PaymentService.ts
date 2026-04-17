import {
  addPayment,
  confirmPayment,
  paymentOrderRepository,
  processPayment,
  PaymentGatewayUnreachableError,
  GatewayTransactionStatus,
} from "../../../package/core/payment";
import { PaymentMethod } from "../../../package/core/payment";
import { UuidVO } from "../../../package/core/shared/domain/Uuid.VO";
import { $saleId } from "../stores/cart";
import {
  $paymentStatus,
  $payments,
  $change,
  type PaymentEntry,
} from "../stores/payment";
import { showToast } from "../stores/toast";

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

    $paymentStatus.set("processing");

    const result = await confirmPayment.execute(paymentId, success);
    if (!result.isSuccess) {
      showToast("Error al procesar el pago", "error");
      return result;
    }

    $payments.set(
      $payments.get().map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: (success
                ? "completed"
                : "failed") as PaymentEntry["status"],
            }
          : p
      )
    );

    await this.refreshOrderStatus(saleId);
    return result;
  },

  async processPayment(method: string, amount: number): Promise<void> {
    const paymentId = await this.registerPayment(method, amount);
    if (!paymentId) return;

    if (method === "CASH") {
      $paymentStatus.set("processing");
      await this.commitPayment(paymentId, true);
      return;
    }

    // Card/Transfer: fire-and-forget to the external gateway.
    $paymentStatus.set("processing");

    const result = await processPayment.execute(paymentId, {
      paymentId,
      amount,
      method: PaymentMethod[method as keyof typeof PaymentMethod],
    });

    if (!result.isSuccess) {
      const err = result.getError()!;
      const saleId = $saleId.get();
      if (saleId) await this.refreshOrderStatus(saleId);
      if (err instanceof PaymentGatewayUnreachableError) {
        showToast("El procesador de pago no está disponible", "error");
      } else {
        showToast("Error inesperado al enviar el pago", "error");
      }
      return;
    }

    // Request accepted — resolution is eventual.
    // Webhook is the production path; this client-side watcher is a
    // temporary bridge until the webhook endpoint is wired up.
    const transactionId = result.getValue()!;
    this.watchTransaction(paymentId, transactionId);
  },

  async watchTransaction(
    paymentId: string,
    transactionId: string
  ): Promise<void> {
    try {
      const res = await fetch("/api/payment/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, transactionId }),
      });

      const saleId = $saleId.get();
      if (saleId) await this.refreshOrderStatus(saleId);

      if (!res.ok) {
        showToast("No se pudo verificar el pago con el procesador", "error");
        return;
      }

      const data = await res.json();
      if (data.status === GatewayTransactionStatus.PENDING) {
        showToast("Pago en proceso — la confirmación puede tardar", "info");
      }
    } catch {
      showToast("Error de conexión al verificar el pago", "error");
    }
  },

  async refreshOrderStatus(saleId: string) {
    const po = (await paymentOrderRepository.findBySaleId(saleId)).getValue();
    if (!po) return;

    // Sync $payments from the domain (single source of truth)
    $payments.set(
      po.getPayments().map((p) => ({
        id: p.getId().getValue(),
        method: p.getMethod(),
        amount: p.getAmount().getValue(),
        status:
          p.getStatus() === "COMPLETED"
            ? "completed"
            : p.getStatus() === "FAILED"
              ? "failed"
              : "pending",
      }))
    );

    $change.set(po.getChange().getValue());

    const status = po.getStatus();
    if (status === "COMPLETED") {
      $paymentStatus.set("completed");
      const changeAmount = po.getChange().getValue();
      if (changeAmount > 0) {
        showToast(
          `Pago completado — Cambio: $${changeAmount.toFixed(2)}`,
          "success"
        );
      } else {
        showToast("Pago completado", "success");
      }
    } else if (status === "FAILED") {
      $paymentStatus.set("failed");
      showToast("El pago ha fallado definitivamente", "error");
    } else {
      $paymentStatus.set("awaiting_payment");
    }
  },
};
