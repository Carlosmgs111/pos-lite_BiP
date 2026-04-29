import { useStore } from "@nanostores/preact";
import { $cartItems, $cartStatus, getCartTotal } from "../stores/cart";
import { SaleService } from "../services/SaleService";
import type { CartItem } from "../stores/cart";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function CartReview({ onNext, onBack }: Props) {
  const items = useStore($cartItems);
  const status = useStore($cartStatus);
  const total = getCartTotal();
  const canConfirm = items.length > 0 && status === "active";

  return (
    <div class="flex flex-col h-full">
      {items.length === 0 ? (
        <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
          <svg class="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="text-sm">El carrito está vacío</p>
          <p class="text-xs mt-1">Agrega productos desde la pestaña anterior</p>
        </div>
      ) : (
        <>
          <div class="flex-1 overflow-y-auto space-y-2">
            {items.map((item: CartItem) => (
              <div
                key={item.productId}
                class="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    ${item.price.toFixed(2)} c/u
                  </p>
                </div>

                {status === "active" && (
                  <div class="flex items-center gap-1 mx-3">
                    <button
                      onClick={() => SaleService.decrementProductQuantity(item.productId)}
                      class="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                      </svg>
                    </button>
                    <span class="w-8 text-center text-sm font-semibold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => SaleService.incrementProductQuantity(item.productId)}
                      class="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                )}

                <div class="flex items-center gap-3">
                  <span class="text-sm font-mono font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  {status === "active" && (
                    <button
                      onClick={() => SaleService.removeProduct(item.productId)}
                      class="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div class="border-t border-gray-200 pt-4 mt-4 space-y-3">
            <div class="space-y-2">
              <div class="flex justify-between text-sm text-gray-500">
                <span>{items.reduce((sum, i) => sum + i.quantity, 0)} artículos</span>
                <span>Subtotal</span>
              </div>
              <div class="flex justify-between items-baseline">
                <span class="text-base font-semibold text-gray-900">Total</span>
                <span class="text-2xl font-mono font-bold text-gray-900">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                onClick={onBack}
                class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Volver
              </button>
              {canConfirm && (
                <button
                  onClick={() => {
                    SaleService.confirmSale();
                    onNext();
                  }}
                  class="flex-1 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Confirmar y proceder al pago
                </button>
              )}
              {status === "confirmed" && (
                <button
                  onClick={onNext}
                  class="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
                >
                  Ir al pago →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
