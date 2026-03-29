import type { OrderRepository } from "../../domain/OrderRepository";
import { Order } from "../../domain/Order";
import { OrderItem } from "../../domain/OrderItem";
import { PriceVO } from "../../../shared/domain/Price.VO";

interface CreateOrderProps {
  id: string;
  items: OrderItem[];
  total: PriceVO;
  createdAt: Date;
}

export class CreateOrder {
  constructor(private orderRepository: OrderRepository) {}
  execute(props: CreateOrderProps) {
    this.orderRepository.registry(Order.create(props));
  }
}
