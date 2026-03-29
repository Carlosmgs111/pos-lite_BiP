import type { Suite, TestResult } from "./runner";
import { registerProduct, createOrder, addItemToOrder, removeItemFromOrder } from "../core";
import { productRepository } from "../core/inventory";
import { orderRepository } from "../core/order";
import { PriceVO } from "../core/shared/domain/Price.VO";
import { UuidVO } from "../core/shared/domain/Uuid.VO";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: "order",
    passed,
    message: passed ? undefined : message,
  };
}

export const orderSuite: Suite = {
  name: "order",
  tests: [
    async () => {
      await createOrder.execute({
        id: "test-ord-1",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      const order = await orderRepository.getOrder("test-ord-1");
      const exists = order !== undefined && order !== null;
      productRepository.purgeDb();
      orderRepository.purgeDb();
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
      await createOrder.execute({
        id: "test-ord-2",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      const r = await addItemToOrder.execute({
        orderId: "test-ord-2",
        itemId: id,
        quantity: 2,
      });
      productRepository.purgeDb();
      orderRepository.purgeDb();
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
      await createOrder.execute({
        id: "test-ord-3",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToOrder.execute({
        orderId: "test-ord-3",
        itemId: id,
        quantity: 2,
      });
      await addItemToOrder.execute({
        orderId: "test-ord-3",
        itemId: id,
        quantity: 3,
      });
      const order = await orderRepository.getOrder("test-ord-3");
      const totalInCents = order.toJSON().total.getValue();
      productRepository.purgeDb();
      orderRepository.purgeDb();
      return result(
        "Accumulates quantity and calculates correct total",
        totalInCents === 75.00
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
      await createOrder.execute({
        id: "test-ord-4",
        items: [],
        total: new PriceVO(0),
        createdAt: new Date(),
      });
      await addItemToOrder.execute({
        orderId: "test-ord-4",
        itemId: id,
        quantity: 7,
      });
      await removeItemFromOrder.execute({
        orderId: "test-ord-4",
        itemId: id,
        quantity: 4,
      });
      const order = await orderRepository.getOrder("test-ord-4");
      const totalInCents = order.toJSON().total.getValue();
      console.log({ totalInCents });
      productRepository.purgeDb();
      orderRepository.purgeDb();
      return result(
        "Removes quantity from order and calculates correct total",
        totalInCents === 60.00
      );
    },
  ],
};
