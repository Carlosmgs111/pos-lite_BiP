import { Order } from "../domain/Order";
import type { OrderRepository } from "../domain/OrderRepository";

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];
  registry(order: Order): Promise<void> {
    this.orders.push(order);
    return Promise.resolve();
  }
  getOrder(id: string): Promise<Order> {
    const order = this.orders.find((order) => order.getId() === id);
    if (!order) {
      throw new Error("Order not found");
    }
    return Promise.resolve(order);
  }
  async update(order: Order): Promise<void> {
    const index = this.orders.findIndex((o) => o.getId() === order.getId());
    if (index === -1) {
      throw new Error("Order not found");
    }
    this.orders[index] = order;
  }
  purgeDb() {
    this.orders = [];
  }
}
