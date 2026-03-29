import { InMemoryOrderRepository } from "./infrastructure/InMemoryOrderRepository";
import { AddItemToOrder } from "./application/use-cases/AddItemToOrder";
import { RemoveItemFromOrder } from "./application/use-cases/RemoveItemFromOrder";
import { ReserveStock } from "./infrastructure/ReserveStock";
import { CreateOrder } from "./application/use-cases/CreateOrder";
import { GetProductInfo } from "./infrastructure/GetProductInfo";

export const orderRepository = new InMemoryOrderRepository();
export const reserveStock = new ReserveStock();
export const getProductInfo = new GetProductInfo();
export const addItemToOrder = new AddItemToOrder(
  reserveStock,
  orderRepository,
  getProductInfo
);
export const removeItemFromOrder = new RemoveItemFromOrder(orderRepository);
export const createOrder = new CreateOrder(orderRepository);
