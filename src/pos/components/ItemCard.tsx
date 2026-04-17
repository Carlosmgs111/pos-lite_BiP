import { SaleService } from "../services/SaleService";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export function ItemCard({ item, status }: { item: CartItem; status: string }) {
  return (
    <div
      key={item.productId}
      class="flex items-center justify-between py-2 px-2 rounded bg-gray-50 gap-2"
    >
      <div class="flex-1">
        <span class="text-sm font-medium text-gray-900">{item.name}</span>
        <span class="text-xs text-gray-400 ml-2">x{item.quantity}</span>
      </div>
      {status === "active" && (
        <div class="flex items-center gap-2">
          <button
            onClick={() => SaleService.decrementProductQuantity(item.productId)}
            class="text-sm text-red-400 hover:text-red-600 w-6 h-6 m-auto bg-red-400/30 rounded "
          >
            -
          </button>
          <button
            onClick={() => SaleService.incrementProductQuantity(item.productId)}
            class="text-sm text-green-400 hover:text-green-600 w-6 h-6 m-auto bg-green-400/30 rounded "
          >
            +
          </button>
        </div>
      )}
      <div class="flex items-center gap-2">
        <span class="text-sm font-mono text-gray-700">
          ${(item.price * item.quantity).toFixed(2)}
        </span>
        {status === "active" && (
          <button
            onClick={() => SaleService.removeProduct(item.productId)}
            class="text-sm text-red-400 hover:text-red-600 w-6 h-6 m-auto bg-red-400/30 rounded"
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}
