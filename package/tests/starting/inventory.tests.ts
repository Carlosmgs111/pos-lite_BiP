import type { Suite, TestResult } from "../runner";
import { registerProduct, getProducts  , handleStockForSale } from "../../core";
import { productRepository } from "../../core/inventory";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "starting-inventory";
const suiteName = "Inventory";
const suiteDescription = "Registro de productos, consulta por ID y reserva de stock";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

export const inventorySuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
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
      const r = await getProducts.execute([id]);
      productRepository.purgeDb();
      return result("Registers a product and retrieves it by id", r.isSuccess);
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
      const r = await getProducts.execute([id]);
      if (!r.isSuccess) {
        return result("Stores product with correct price", false);
      }
      const price = r.getValue()![0].getPrice();
      productRepository.purgeDb();
      return result(
        "Stores product with correct price",
        price === 25.5
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
      const r = await handleStockForSale.reserveStock(id, 3);
      productRepository.purgeDb();
      return result(
        "Reserves stock successfully for valid quantity",
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
      const r = await handleStockForSale.reserveStock(id, 5);
      productRepository.purgeDb();
      return result(
        "Fails when reserving more than available stock",
        !r.isSuccess
      );
    },
    async () => {
      const r = await getProducts.execute(["non-existent-with-invalid-uuid"]); 
      productRepository.purgeDb();
      return result("returns error for nonexistent product", !r.isSuccess);
    },
  ],
};
