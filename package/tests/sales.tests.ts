import type { Suite, TestResult } from "./runner";
import { registerProduct, createSale, addItemToSale, removeItemFromSale } from "../core";
import { productRepository } from "../core/inventory";
import { saleRepository } from "../core/sales";
import { PriceVO } from "../core/shared/domain/Price.VO";
import { UuidVO } from "../core/shared/domain/Uuid.VO";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: "sales",
    passed,
    message: passed ? undefined : message,
  };
}

export const saleSuite: Suite = {
  name: "sales",
  tests: [
    async () => {
      await createSale.execute({
        id: "test-sale-1",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      const sale = await saleRepository.getSale("test-sale-1");
      const exists = sale !== undefined && sale !== null;
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Creates an empty order", exists);
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item A",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: "test-sale-2",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      const r = await addItemToSale.execute({
        saleId: "test-sale-2",
        itemId: id,
        quantity: 2,
      });
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Adds item to order", r.isSuccess);
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item B",
        price: 15,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: "test-sale-3",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId: "test-sale-3",
        itemId: id,
        quantity: 2,
      });
      await addItemToSale.execute({
        saleId: "test-sale-3",
        itemId: id,
        quantity: 3,
      });
      const sale = await saleRepository.getSale("test-sale-3");
      const total = sale.toJSON().total.getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Accumulates quantity and calculates correct total",
        total === 75.00
      );
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item C",
        price: 20,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: "test-sale-4",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId: "test-sale-4",
        itemId: id,
        quantity: 7,
      });
      await removeItemFromSale.execute({
        saleId: "test-sale-4",
        itemId: id,
        quantity: 4,
      });
      const sale = await saleRepository.getSale("test-sale-4");
      const total = sale.toJSON().total.getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Removes quantity from order and calculates correct total",
        total === 60.00
      );
    },
  ],
};
