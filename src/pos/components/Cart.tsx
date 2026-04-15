import { useStore } from "@nanostores/preact";
import { $cartItems, $cartStatus, getCartTotal } from "../stores/cart";
import { SaleService } from "../services/SaleService";
import { ItemCard } from "./ItemCard";

export default function Cart() {
  const items = useStore($cartItems);
  const status = useStore($cartStatus);
  const total = getCartTotal();
  const canConfirm = items.length > 0 && status === "active";

  return (
    <div class="flex flex-col h-full">
      <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
        Venta actual
      </h2>

      {items.length === 0 ? (
        <div class="flex-1 flex items-center justify-center text-sm text-gray-400">
          Selecciona productos para comenzar
        </div>
      ) : (
        <>
          <div class="flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <ItemCard item={item} status={status} />
            ))}
          </div>

          <div class="border-t border-gray-200 pt-3 mt-3">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm font-bold text-gray-900">Total</span>
              <span class="text-lg font-mono font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>

            {canConfirm && (
              <button
                onClick={() => SaleService.confirmSale()}
                class="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-98 transition-all"
              >
                Confirmar venta
              </button>
            )}

            {status === "confirmed" && (
              <div class="text-center text-sm text-emerald-600 font-medium py-2">
                Venta confirmada — procede al pago
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
