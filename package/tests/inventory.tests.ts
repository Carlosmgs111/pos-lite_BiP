import type { Suite, TestResult } from "./runner";
import { registerProduct, getProduct, reserveStock } from "../core";
import { productRepository } from "../core/inventory";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: "inventory",
    passed,
    message: passed ? undefined : message,
  };
}

export const inventorySuite: Suite = {
  name: "inventory",
  tests: [
    async () => {
      await registerProduct.execute({
        id: "test-inv-1",
        name: "Product A",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      const r = await getProduct.execute("test-inv-1");
      productRepository.purgeDb();
      return result("registers a product and retrieves it by id", r.isSuccess);
    },
    async () => {
      await registerProduct.execute({
        id: "test-inv-2",
        name: "Product B",
        price: 25.5,
        stock: 5,
        reservedStock: 0,
      });
      const r = await getProduct.execute("test-inv-2")!;
      const priceInCents = r.getValue().getPrice();
      productRepository.purgeDb();
      return result(
        "stores product with correct price in cents",
        priceInCents === 2550
      );
    },
    async () => {
      await registerProduct.execute({
        id: "test-inv-3",
        name: "Product C",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      const r = await reserveStock.execute("test-inv-3", 3);
      productRepository.purgeDb();
      return result(
        "reserves stock successfully for valid quantity",
        r.isSuccess
      );
    },
    async () => {
      await registerProduct.execute({
        id: "test-inv-4",
        name: "Product D",
        price: 10,
        stock: 2,
        reservedStock: 0,
      });
      const r = await reserveStock.execute("test-inv-4", 5);
      productRepository.purgeDb();
      return result(
        "fails when reserving more than available stock",
        !r.isSuccess
      );
    },
    async () => {
      const r = await getProduct.execute("nonexistent");
      productRepository.purgeDb();
      return result("returns error for nonexistent product", !r.isSuccess);
    },
  ],
};
