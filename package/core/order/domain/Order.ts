import { OrderItem } from "./OrderItem";
import { OrdersStates } from "./OrdersStates";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";

class OrderItemNotFound extends Error {
  constructor() {
    super("Item not found");
  }
}

interface OrderProps {
  id: string;
  items: OrderItem[];
  total: PriceVO;
  createdAt: Date;
}

export class Order {
  constructor(
    private id: string,
    private items: OrderItem[],
    private total: PriceVO,
    private createdAt: Date,
    private state: OrdersStates
  ) {}

  getId() {
    return this.id;
  }

  static create(props: OrderProps) {
    return new Order(
      props.id,
      props.items,
      props.total,
      props.createdAt,
      OrdersStates.PENDING
    );
  }
  addItem(item: OrderItem): void {
    const itemExists = this.findItemById(item.getId());
    if (itemExists.isSuccess) {
      itemExists.getValue()!.incrementQuantity(item.getQuantity());
    } else {
      this.items.push(item);
    }
    this.calculateTotal();
  }
  removeItem(id: string, quantity: number): void {
    const itemExists = this.findItemById(id);
    if (itemExists.isSuccess) {
      itemExists.getValue()!.decrementQuantity(quantity);
    }
    this.calculateTotal();
  }
  findItemById(id: string): Result<OrderItemNotFound, OrderItem> {
    const item = this.items.find((item) => item.getId() === id);
    if (!item) {
      return Result.fail(new OrderItemNotFound());
    }
    return Result.ok(item);
  }
  calculateTotal(): void {
    this.total = PriceVO.add(this.items.map((item) => item.getTotal()));
  }
  toJSON() {
    return {
      id: this.id,
      items: [...this.items],
      total: this.total,
      createdAt: this.createdAt,
      state: this.state,
    };
  }
}
