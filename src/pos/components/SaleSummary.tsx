import { useStore } from "@nanostores/preact";
import { $cartItems, $cartStatus, getCartTotal, $saleId } from "../stores/cart";
import { $totalToPay } from "../stores/payment";
import type { CartItem } from "../stores/cart";

interface Props {
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function SaleSummary({ onConfirm, onBack, onCancel }: Props) {
  const items = useStore($cartItems);
  const status = useStore($cartStatus);
  const total = getCartTotal();
  const saleId = useStore($saleId);
  const totalToPay = useStore($totalToPay);

  return (
    <div class="flex flex-col h-full">
      {status === "confirmed" ? (
        <>
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm font-medium text-emerald-700">Venta confirmada</p>
            </div>
            <p class="text-xs text-emerald-600 mt-1">Procede al pago para completar la transacción</p>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div class="space-y-2">
              {items.map((item: CartItem) => (
                <div
                  key={item.productId}
                  class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p class="text-xs text-gray-500">
                      {item.quantity} x ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <span class="text-sm font-mono font-medium text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div class="border-t border-gray-200 pt-4 mt-4">
            <div class="bg-gray-900 rounded-lg p-4 text-white mb-4">
              <div class="flex justify-between items-baseline">
                <span class="text-sm text-gray-400">Total</span>
                <span class="text-2xl font-mono font-bold">${totalToPay.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onConfirm}
              class="w-full py-3 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              Ir al pago →
            </button>
          </div>
        </>
      ) : (
        <>
          <div class="flex-1 overflow-y-auto">
            {saleId && (
              <div class="mb-4">
                <p class="text-xs text-gray-500">ID de venta</p>
                <p class="text-sm font-mono text-gray-700">{saleId}</p>
              </div>
            )}

            <div class="space-y-2 mb-4">
              {items.map((item: CartItem) => (
                <div
                  key={item.productId}
                  class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p class="text-xs text-gray-500">
                      {item.quantity} x ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <span class="text-sm font-mono font-medium text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div class="border-t border-gray-200 pt-4 mt-4 space-y-3">
            <div class="flex justify-between items-baseline">
              <span class="text-base font-semibold text-gray-900">Total</span>
              <span class="text-2xl font-mono font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>

            <p class="text-xs text-gray-500">
              Al confirmar la venta, no podrás modificar los artículos. Procederás al pago.
            </p>

            <div class="flex gap-2">
              <button
                onClick={onBack}
                class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Volver al carrito
              </button>
              <button
                onClick={onCancel}
                class="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Cancelar
              </button>
            </div>

            <button
              onClick={() => {
                onConfirm();
              }}
              disabled={items.length === 0}
              class="w-full py-3 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar venta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
