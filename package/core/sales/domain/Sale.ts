import { SaleItem } from "./SaleItem";
import { SaleStates } from "./SaleStates";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import type { SaleItemProps } from "./SaleItem";

class SaleItemNotFound extends Error {
  constructor() {
    super("Item not found");
  }
}

interface SaleProps {
  id: string;
  items: SaleItemProps[];
  total: PriceVO;
  createdAt: Date;
}

export class Sale {
  constructor(
    private id: string,
    private readonly items: SaleItem[],
    private total: PriceVO,
    private createdAt: Date,
    private state: SaleStates
  ) {}
  static create(props: Omit<SaleProps, "total">) {
    const saleItems: SaleItem[] = [];
    for (let item of props.items) {
      const saleItemResult = SaleItem.create({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      });
      if (!saleItemResult.isSuccess) {
        // TODO: Log error and notify user
        Result.fail(saleItemResult.getError());
      }
      saleItems.push(saleItemResult.getValue()!);
    }
    const sale = new Sale(
      props.id,
      saleItems,
      PriceVO.add(saleItems.map((item) => item.getTotal())),
      props.createdAt,
      SaleStates.PENDING
    );
    return sale;
  }
  recalculateTotal(): void {
    this.total = PriceVO.add(this.items.map((item) => item.getTotal()));
  }
  findItemById(id: string): Result<SaleItemNotFound, SaleItem> {
    const item = this.items.find((item) => item.getId() === id);
    if (!item) {
      return Result.fail(new SaleItemNotFound());
    }
    return Result.ok(item);
  }
  getId() {
    return this.id;
  }
  completeSale(): void {
    this.state = SaleStates.COMPLETED;
  }
  addItem(item: SaleItemProps): void {
    const itemExists = this.findItemById(item.id);
    if (itemExists.isSuccess) {
      itemExists.getValue()!.incrementQuantity(item.quantity);
      this.recalculateTotal();
      return;
    }
    const saleItemResult = SaleItem.create(item);
    if (!saleItemResult.isSuccess) {
      // TODO: Log error and notify user
      Result.fail(saleItemResult.getError());
    }
    this.items.push(saleItemResult.getValue()!);
    this.recalculateTotal();
  }
  getItems() {
    return [...this.items];
  }
  getTotal() {
    return this.total;
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
