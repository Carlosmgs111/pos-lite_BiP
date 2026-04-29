import { useStore } from "@nanostores/preact";
import { useState } from "preact/hooks";
import { $catalog } from "../stores/catalog";
import { SaleService } from "../services/SaleService";
import type { CatalogProduct } from "../stores/catalog";

interface Props {
  onProductAdded?: (product: CatalogProduct) => void;
}

export default function ProductSelector({ onProductAdded }: Props) {
  const catalog = useStore($catalog);
  const [search, setSearch] = useState("");

  const filtered = catalog.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (product: CatalogProduct) => {
    await SaleService.addProduct({
      id: product.id,
      name: product.name,
      price: product.price,
    });
    onProductAdded?.(product);
  };

  return (
    <div class="flex flex-col h-full">
      <div class="mb-4">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Buscar producto..."
            class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((product) => {
              const outOfStock = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && handleAdd(product)}
                  disabled={outOfStock}
                  class={`text-left p-4 rounded-xl border-2 transition-all ${
                    outOfStock
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
                  }`}
                >
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-semibold text-gray-900 line-clamp-2">
                      {product.name}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-mono font-bold text-emerald-700">
                      ${product.price.toFixed(2)}
                    </span>
                    <span
                      class={`text-xs px-2 py-1 rounded-full ${
                        outOfStock
                          ? "bg-red-50 text-red-600"
                          : product.stock <= 5
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {outOfStock ? "Sin stock" : `${product.stock} uds`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
