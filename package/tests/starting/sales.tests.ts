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
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "starting-sales";
const suiteName = "Sales";
const suiteDescription = "Creacion de ventas, agregar/remover items, cancelar y confirmar ventas";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

export const saleSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  tests: [
    async () => {
      const saleId = UuidVO.generate();
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      const sale = await saleRepository.getSaleById(saleId);
      const exists = sale !== undefined && sale !== null;
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Creates an empty order", exists);
    },
    async () => {
      const id = UuidVO.generate();
      const saleId = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item A",
        price: 10,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      const r = await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 2,
      });
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Adds item to order", r.isSuccess);
    },
    async () => {
      const id = UuidVO.generate();
      const saleId = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item B",
        price: 15,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 2,
      });
      await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 3,
      });
      const sale = await saleRepository.getSaleById(saleId);
      const total = sale.getValue()!.getTotal().getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Accumulates quantity and calculates correct total",
        total === 75.0
      );
    },
    async () => {
      const id = UuidVO.generate();
      const saleId = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item C",
        price: 20,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 7,
      });
      await removeItemFromSale.execute({
        saleId,
        itemId: id,
        quantity: 4,
      });
      const sale = await saleRepository.getSaleById(saleId);
      const total = sale.getValue()!.getTotal().getValue();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result(
        "Removes quantity from order and calculates correct total",
        total === 60.0
      );
    },
    async () => {
      const id = UuidVO.generate();
      const saleId = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item D",
        price: 25,
        stock: 11,
        reservedStock: 0,
      });
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 7,
      });
      await cancelSale.execute(saleId);
      const product = await productRepository.getProducts([id]);
      const stock = product.getValue()![0].getStock();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Cancels order and releases stock", stock === 11);
    },
    async () => {
      const id = UuidVO.generate();
      const saleId = UuidVO.generate();
      await registerProduct.execute({
        id,
        name: "Item E",
        price: 30,
        stock: 10,
        reservedStock: 0,
      });
      await createSale.execute({
        id: saleId,
        itemIds: [],
        createdAt: new Date(),
      });
      await addItemToSale.execute({
        saleId,
        itemId: id,
        quantity: 7,
      });
      await registerSale.execute(saleId);
      const product = await productRepository.getProducts([id]);
      const stock = product.getValue()![0].getStock();
      productRepository.purgeDb();
      saleRepository.purgeDb();
      return result("Registers order and confirms stock", stock === 3);
    }
  ],
};
