import { atom } from "nanostores";

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export const $catalog = atom<CatalogProduct[]>([]);

export function setCatalog(products: CatalogProduct[]) {
  $catalog.set(products);
}

export function updateProductStock(productId: string, newStock: number) {
  const products = $catalog.get();
  $catalog.set(
    products.map((p) =>
      p.id === productId ? { ...p, stock: newStock } : p
    )
  );
}


