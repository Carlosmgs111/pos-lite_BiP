import { useStore } from "@nanostores/preact";
import { useState } from "preact/hooks";
import {
  $paymentStatus,
  $payments,
  $change,
  $totalToPay,
  getRemainingAmount,
  getPaidAmount,
} from "../../stores/payment";
import { PaymentService } from "../services/PaymentService";
import { SaleService } from "../services/SaleService";

const METHODS = [
  { key: "CASH", label: "Efectivo" },
  { key: "CARD", label: "Tarjeta" },
  { key: "TRANSFER", label: "Transferencia" },
];

export default function PaymentPanel() {
  const status = useStore($paymentStatus);
  const payments = useStore($payments);
  const change = useStore($change);
  const totalToPay = useStore($totalToPay);
  const [selectedMethod, setSelectedMethod] = useState("CASH");
  const [amount, setAmount] = useState("");

  const remaining = getRemainingAmount();
  const paid = getPaidAmount();

  if (status === "idle") {
    return (
      <div class="flex flex-col h-full">
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
          Pago
        </h2>
        <div class="flex-1 flex items-center justify-center text-sm text-gray-400">
          Confirma una venta para iniciar el pago
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div class="flex flex-col h-full">
        <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
          Pago
        </h2>
        <div class="flex-1 flex flex-col items-center justify-center gap-3">
          <div class="text-3xl font-bold text-emerald-600">Completado</div>
          {change > 0 && (
            <div class="text-lg text-gray-700">
              Cambio: <span class="font-mono font-bold">${change.toFixed(2)}</span>
            </div>
          )}
          <button
            onClick={() => SaleService.startNewTransaction()}
            class="mt-4 py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
          >
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    PaymentService.processPayment(selectedMethod, numAmount);
    setAmount("");
  };

  return (
    <div class="flex flex-col h-full">
      <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
        Pago
      </h2>

      <div class="flex justify-between text-sm mb-3">
        <span class="text-gray-500">Total</span>
        <span class="font-mono font-bold text-gray-900">${totalToPay.toFixed(2)}</span>
      </div>
      <div class="flex justify-between text-sm mb-3">
        <span class="text-gray-500">Pagado</span>
        <span class="font-mono text-emerald-700">${paid.toFixed(2)}</span>
      </div>
      <div class="flex justify-between text-sm mb-4">
        <span class="text-gray-500">Restante</span>
        <span class="font-mono font-bold text-amber-700">${remaining.toFixed(2)}</span>
      </div>

      {payments.length > 0 && (
        <div class="space-y-1 mb-4">
          {payments.map((p) => (
            <div key={p.id} class="flex items-center justify-between py-1 px-2 rounded bg-gray-50 text-xs">
              <span class="text-gray-600">{p.method}</span>
              <span class="font-mono">${p.amount.toFixed(2)}</span>
              <span class={p.status === "completed" ? "text-emerald-600" : p.status === "failed" ? "text-red-600" : "text-amber-500"}>
                {p.status === "completed" ? "OK" : p.status === "failed" ? "FALLO" : "..."}
              </span>
            </div>
          ))}
        </div>
      )}

      {status !== "processing" && (
        <form onSubmit={handleSubmit} class="mt-auto space-y-3">
          <div class="flex gap-1">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMethod(m.key)}
                class={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                  selectedMethod === m.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
            placeholder={`Monto (restante: $${remaining.toFixed(2)})`}
            class="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            class="w-full py-2 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:scale-98 transition-all"
          >
            Registrar pago
          </button>
        </form>
      )}

      {status === "processing" && (
        <div class="mt-auto text-center text-sm text-amber-600 font-medium py-4">
          Procesando pago...
        </div>
      )}
    </div>
  );
}
