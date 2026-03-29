import type { OrderRepository } from "../../domain/OrderRepository";
import { Order } from "../../domain/Order";

export class RegisterOrder {
  constructor(private orderRepository: OrderRepository) {}
  execute(order: Order): Promise<void> {
    return this.orderRepository.registry(order);
  }
}
 