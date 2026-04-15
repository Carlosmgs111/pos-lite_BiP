import { useStore } from "@nanostores/preact";
import { $catalog } from "../stores/catalog";
import { SaleService } from "../services/SaleService";
import ProductCard from "./ProductCard";
import type { CatalogProduct } from "../stores/catalog";

export default function ProductGrid() {
  const catalog = useStore($catalog);

  const handleAdd = async (product: CatalogProduct) => {
    await SaleService.addProduct({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  return (
    <div>
      <h2 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
        Productos
      </h2>
      <div class="grid grid-cols-2 gap-2">
        {catalog.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={handleAdd}
          />
        ))}
      </div>
    </div>
  );
}
