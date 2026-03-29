import { Order } from "../../domain/Order";
import { OrderItem } from "../../domain/OrderItem";
import type { ReserveStock } from "../ports/ReserveStock";
import type { OrderRepository } from "../../domain/OrderRepository";
import type { GetProductInfo } from "../ports/GetProductInfo";
import { PriceVO } from "../../../shared/domain/Price.VO";
import { Result } from "../../../shared/domain/Result";

interface AddItemToOrderProps {
  orderId: string;
  itemId: string;
  quantity: number; 
}

export class AddItemToOrder {
  constructor(
    private reserveStock: ReserveStock,
    private orderRepository: OrderRepository,
    private getProductInfo: GetProductInfo
  ) {}
  async execute(props: AddItemToOrderProps) {
    const order: Order = await this.orderRepository.getOrder(props.orderId);
    const reserveStockResult = await this.reserveStock.execute(props.itemId, props.quantity);
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute(props.itemId);
    if (!productInfoResult.isSuccess) {
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()!;
    const item = new OrderItem(
      props.itemId,
      productInfo.name,
      props.quantity,
      new PriceVO(productInfo.price),
      new PriceVO(props.quantity * productInfo.price)
    );
    console.log({item});
    order.addItem(item);
    await this.orderRepository.update(order);
    return Result.ok(order);
  }
}
