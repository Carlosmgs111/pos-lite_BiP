import {
  setCatalog,
  updateProductStock,
  type CatalogProduct,
} from "../stores/catalog";

let initialized = false;

export const CatalogService = {
  async init() {
    if (initialized) return;
    initialized = true;

    const res = await fetch("/api/catalog/init", { method: "POST" });
    if (!res.ok) return;

    const data = await res.json();
    setCatalog(
      data.products.map((p: CatalogProduct) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
      }))
    );
  },

  async refreshProductStock(productId: string) {
    const res = await fetch(`/api/catalog/stock?productId=${productId}`);
    if (!res.ok) return;

    const data = await res.json();
    updateProductStock(productId, data.stock);
  },
};
