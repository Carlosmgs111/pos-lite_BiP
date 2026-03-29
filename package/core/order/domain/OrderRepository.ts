import { Order } from "./Order";

export interface OrderRepository {
    registry(order: Order): Promise<void>;
    getOrder(id: string): Promise<Order>;
    update(order: Order): Promise<void>;
}