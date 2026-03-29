import { Result } from "../../../shared/domain/Result";
import type { OrderRepository } from "../../domain/OrderRepository";

export class RemoveItemFromOrder {
  constructor(private orderRepository: OrderRepository) {}
  async execute({
    orderId,
    itemId,
    quantity,
  }: {
    orderId: string;
    itemId: string;
    quantity: number;
  }): Promise<Result<Error, boolean>> {
    const order = await this.orderRepository.getOrder(orderId);
    if (!order) {
      return Result.fail(new Error("Order not found"));
    }
    order.removeItem(itemId, quantity);
    await this.orderRepository.update(order);
    return Result.ok(true);
  }
}
