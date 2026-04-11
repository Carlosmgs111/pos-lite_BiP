import { registerProduct, getProducts } from "../../../package/core";
import { UuidVO } from "../../../package/core/shared/domain/Uuid.VO";
import {
  setCatalog,
  updateProductStock,
  type CatalogProduct,
} from "../../stores/catalog";

const DEMO_PRODUCTS = [
  { name: "Cafe Americano", price: 2.5, stock: 50 },
  { name: "Cafe Latte", price: 3.5, stock: 40 },
  { name: "Cappuccino", price: 4, stock: 30 },
  { name: "Te Verde", price: 2, stock: 60 },
  { name: "Jugo Natural", price: 3, stock: 25 },
  { name: "Agua Mineral", price: 1.5, stock: 100 },
  { name: "Sandwich Club", price: 5.5, stock: 20 },
  { name: "Croissant", price: 2.5, stock: 35 },
];

export const CatalogService = {
  async init() {
    const products: CatalogProduct[] = [];
    for (const p of DEMO_PRODUCTS) {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        reservedStock: 0,
      });
      products.push({ id, name: p.name, price: p.price, stock: p.stock });
    }
    setCatalog(products);
  },

  async refreshProductStock(productId: string) {
    const result = await getProducts.execute([productId]);
    if (!result.isSuccess) {
      console.error(result.getError());
      return;
    }
    if (result.isSuccess && result.getValue()) {
      const product = result.getValue()![0];
      updateProductStock(productId, product.getStock());
    }
  },
};
