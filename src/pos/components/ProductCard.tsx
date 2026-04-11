import type { CatalogProduct } from "../../stores/catalog";

interface Props {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct) => void;
}

export default function ProductCard({ product, onAdd }: Props) {
  const outOfStock = product.stock <= 0;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      class={`text-left p-3 rounded-lg border transition-all ${
        outOfStock
          ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer active:scale-95"
      }`}
    >
      <div class="flex justify-between items-start">
        <span class="text-sm font-semibold text-gray-900">{product.name}</span>
        <span class="text-sm font-mono font-bold text-emerald-700">
          ${product.price.toFixed(2)}
        </span>
      </div>
      <div class="mt-1 text-xs text-gray-400">
        {outOfStock ? "Sin stock" : `${product.stock} disponibles`}
      </div>
    </button>
  );
}
