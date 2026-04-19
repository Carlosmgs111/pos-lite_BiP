import {
  setCatalog,
  updateProductStock,
  type CatalogProduct,
} from "../stores/catalog";

export const CatalogService = {
  async init() {
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
