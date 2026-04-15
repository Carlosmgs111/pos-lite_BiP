import { useState } from "preact/hooks";
import { PaymentService } from "../services/PaymentService";

interface Props {
  paymentId: string;
  method: string;
  amount: number;
  onClose: () => void;
}

export default function PaymentResultModal({ paymentId, method, amount, onClose }: Props) {
  const [resolving, setResolving] = useState(false);

  const handleResult = async (success: boolean) => {
    setResolving(true);
    await PaymentService.commitPayment(paymentId, success);
    setResolving(false);
    onClose();
  };

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" />
      <div class="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
        <h3 class="text-base font-bold text-gray-900 text-center">
          Resultado del procesador
        </h3>

        <div class="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Metodo</span>
            <span class="font-medium text-gray-900">{method}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Monto</span>
            <span class="font-mono font-bold text-gray-900">${amount.toFixed(2)}</span>
          </div>
        </div>

        <p class="text-xs text-gray-400 text-center">
          Simula la respuesta del procesador de pago externo
        </p>

        {resolving ? (
          <div class="text-center text-sm text-amber-600 font-medium py-2">
            Procesando...
          </div>
        ) : (
          <div class="flex gap-3">
            <button
              onClick={() => handleResult(false)}
              class="flex-1 py-2.5 px-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-all"
            >
              Rechazar
            </button>
            <button
              onClick={() => handleResult(true)}
              class="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all"
            >
              Aprobar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
