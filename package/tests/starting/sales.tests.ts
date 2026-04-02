import type { Suite, TestResult } from "../runner";
import {
  registerProduct,
  createSale,
  addItemToSale,
  removeItemFromSale,
  cancelSale,
  registerSale,
} from "../../core";
import { productRepository } from "../../core/inventory";
import { saleRepository } from "../../core/sales";
import { PriceVO } from "../../core/shared/domain/Price.VO";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteName = "starting/sales";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

export const saleSuite: Suite = {
  name: suiteName,
  tests: [
    async () => {
      await createSale.execute({
        id: "test-sale-1",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      const sale = await saleRepository.getSaleById("test-sale-1");
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
      const sale = await saleRepository.getSaleById("test-sale-3");
      const total = sale.getValue()!.toJSON().total.getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Accumulates quantity and calculates correct total",
        total === 75.0
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
      const sale = await saleRepository.getSaleById("test-sale-4");
      const total = sale.getValue()!.toJSON().total.getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Removes quantity from order and calculates correct total",
        total === 60.0
      );
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item D",
        price: 25,
        stock: 11,
        reservedStock: 0,
      });
      await createSale.execute({
        id: "test-sale-5",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId: "test-sale-5",
        itemId: id,
        quantity: 7,
      });
      await cancelSale.execute("test-sale-5");
      const product = await productRepository.getProduct(id);
      const stock = product.getValue()!.getStock();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Cancels order and releases stock", stock === 11);
    },
    async () => {
      const id = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item E",
        price: 30,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: "test-sale-6",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId: "test-sale-6",
        itemId: id,
        quantity: 7,
      });
      await registerSale.execute("test-sale-6");
      const product = await productRepository.getProduct(id);
      console.log(product.getValue()!.getStock());
      const stock = product.getValue()!.getStock();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Registers order and confirms stock", stock === 3);
    }
  ],
};
