import type { Suite, TestResult } from "./runner";
import { registerProduct, getProduct, reserveStock } from "../core";
import { productRepository } from "../core/inventory";
import { UuidVO } from "../core/shared/domain/Uuid.VO";

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
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Product A",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      const r = await getProduct.execute(id);
      productRepository.purgeDb();
      return result("registers a product and retrieves it by id", r.isSuccess);
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Product B",
        price: 25.5,
        stock: 5,
        reservedStock: 0,
      });
      const r = await getProduct.execute(id);
      const priceInCents = r.getValue().getPrice();
      productRepository.purgeDb();
      return result(
        "stores product with correct price in cents",
        priceInCents === 25.50
      );
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Product C",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      const r = await reserveStock.execute(id, 3);
      productRepository.purgeDb();
      return result(
        "reserves stock successfully for valid quantity",
        r.isSuccess
      );
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Product D",
        price: 10,
        stock: 2,
        reservedStock: 0,
      });
      const r = await reserveStock.execute(id, 5);
      productRepository.purgeDb();
      return result(
        "fails when reserving more than available stock",
        !r.isSuccess
      );
    },
    async () => {
      const r = await getProduct.execute("non-existent-with-invalid-uuid");
      productRepository.purgeDb();
      return result("returns error for nonexistent product", !r.isSuccess);
    },
  ],
};
