import type { OrderRepository } from "../../domain/OrderRepository";
import { Order } from "../../domain/Order";
import { OrdersStates } from "../../domain/OrdersStates";

export class RegisterOrder {
  constructor(private orderRepository: OrderRepository) {}
  execute(order: Order): Promise<void> {
    order.calculateTotal();
    return this.orderRepository.registry(order);
  }
}
 