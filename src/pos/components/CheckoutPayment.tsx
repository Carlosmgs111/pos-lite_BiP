import { useStore } from "@nanostores/preact";
import { useState } from "preact/hooks";
import {
  $paymentStatus,
  $payments,
  $change,
  $totalToPay,
  getRemainingAmount,
  getPaidAmount,
} from "../stores/payment";
import { PaymentService } from "../services/PaymentService";
import { SaleService } from "../services/SaleService";
import type { PaymentEntry } from "../stores/payment";

const METHODS = [
  { key: "CASH", label: "Efectivo", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { key: "CARD", label: "Tarjeta", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { key: "TRANSFER", label: "Transferencia", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
];

export default function CheckoutPayment() {
  const status = useStore($paymentStatus);
  const payments = useStore($payments);
  const change = useStore($change);
  const totalToPay = useStore($totalToPay);
  const [selectedMethod, setSelectedMethod] = useState("CASH");
  const [amount, setAmount] = useState("");

  const remaining = getRemainingAmount();
  const paid = getPaidAmount();
  const progress = totalToPay > 0 ? (paid / totalToPay) * 100 : 0;

  if (status === "completed") {
    return (
      <div class="flex flex-col h-full">
        <div class="flex-1 flex flex-col items-center justify-center gap-4">
          <div class="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg class="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-emerald-600">Pago completado</p>
            {change > 0 && (
              <p class="text-lg text-gray-700 mt-2">
                Cambio: <span class="font-mono font-bold">${change.toFixed(2)}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => SaleService.startNewTransaction()}
            class="mt-4 py-2.5 px-8 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
          >
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div class="flex flex-col h-full">
        <div class="flex-1 flex flex-col items-center justify-center gap-4">
          <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p class="text-xl font-bold text-red-600">Pago fallido</p>
          <p class="text-sm text-gray-500 text-center">Se han agotado los intentos de pago</p>
          <button
            onClick={() => SaleService.startNewTransaction()}
            class="mt-4 py-2.5 px-8 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
          >
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    setAmount("");
    await PaymentService.processPayment(selectedMethod, numAmount);
  };

  return (
    <div class="flex flex-col h-full">
      {/* Total display */}
      <div class="bg-gray-900 rounded-xl p-4 mb-4 text-white">
        <p class="text-sm text-gray-400 mb-1">Total a pagar</p>
        <p class="text-3xl font-mono font-bold">${totalToPay.toFixed(2)}</p>
      </div>

      {/* Progress bar */}
      {paid > 0 && (
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-500">Progreso del pago</span>
            <span class="font-medium text-gray-900">{progress.toFixed(0)}%</span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Pagado: ${paid.toFixed(2)}</span>
            <span>Restante: ${remaining.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div class="mb-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Historial de pagos</p>
          <div class="space-y-1.5">
            {payments.map((p: PaymentEntry) => (
              <div
                key={p.id}
                class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <div class="flex items-center gap-2">
                  <span
                    class={`w-2 h-2 rounded-full ${
                      p.status === "completed"
                        ? "bg-emerald-500"
                        : p.status === "failed"
                        ? "bg-red-500"
                        : "bg-amber-500 animate-pulse"
                    }`}
                  ></span>
                  <span class="text-gray-700">{p.method}</span>
                </div>
                <span class="font-mono font-medium">${p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment form */}
      {status !== "processing" && (
        <form onSubmit={handleSubmit} class="mt-auto space-y-3">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Método de pago</p>
          <div class="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMethod(m.key)}
                class={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all ${
                  selectedMethod === m.key
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={m.icon} />
                </svg>
                <span class="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">
              Monto {remaining < totalToPay && `(restante: $${remaining.toFixed(2)})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
              placeholder="0.00"
              class="w-full py-3 px-4 border border-gray-200 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            Procesar pago
          </button>
        </form>
      )}

      {status === "processing" && (
        <div class="mt-auto text-center py-6">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
            <svg class="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p class="text-sm font-medium text-amber-600">Procesando pago...</p>
          <p class="text-xs text-gray-500 mt-1">Esto puede tomar unos momentos</p>
        </div>
      )}
    </div>
  );
}
