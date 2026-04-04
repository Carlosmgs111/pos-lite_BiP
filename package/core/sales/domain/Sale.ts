import { SaleItem } from "./SaleItem";
import { SaleStates } from "./SaleStates";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import type { SaleItemProps } from "./SaleItem";
import { SaleItemNotFoundError } from "./Errors/SaleItemNotFoundError";
import { InvalidSaleStateError } from "./Errors/InvalidSaleStateError";

interface SaleProps {
  id: string;
  items: SaleItemProps[];
  createdAt: Date;
}

export class Sale {
  private constructor(
    private id: string,
    private readonly items: SaleItem[],
    private total: PriceVO,
    private createdAt: Date,
    private state: SaleStates
  ) {}
  static create(props: SaleProps): Result<Error, Sale> {
    const saleItems: SaleItem[] = [];
    for (const item of props.items) {
      const saleItemResult = SaleItem.create(item);
      if (!saleItemResult.isSuccess) {
        return Result.fail(saleItemResult.getError());
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
    return Result.ok(sale);
  }
  recalculateTotal(): void {
    this.total = PriceVO.add(this.items.map((item) => item.getTotal()));
  }
  findItemById(id: string): Result<SaleItemNotFoundError, SaleItem> {
    const item = this.items.find((item) => item.getId() === id);
    if (!item) {
      return Result.fail(new SaleItemNotFoundError());
    }
    return Result.ok(item);
  }
  getId() {
    return this.id;
  }
  getState() {
    return this.state;
  }
  completeSale(): Result<InvalidSaleStateError, void> {
    if (this.state !== SaleStates.PENDING) {
      return Result.fail(new InvalidSaleStateError("Can only complete a pending sale"));
    }
    this.state = SaleStates.COMPLETED;
    return Result.ok(undefined);
  }
  cancelSale(): Result<InvalidSaleStateError, void> {
    if (this.state !== SaleStates.PENDING) {
      return Result.fail(new InvalidSaleStateError("Can only cancel a pending sale"));
    }
    this.state = SaleStates.CANCELLED;
    return Result.ok(undefined);
  }
  addItem(item: SaleItemProps): Result<Error, void> {
    if (this.state !== SaleStates.PENDING) {
      return Result.fail(new InvalidSaleStateError("Can only add items to a pending sale"));
    }
    const itemExists = this.findItemById(item.id);
    if (itemExists.isSuccess) {
      itemExists.getValue()!.incrementQuantity(item.quantity);
      this.recalculateTotal();
      return Result.ok(undefined);
    }
    const saleItemResult = SaleItem.create(item);
    if (!saleItemResult.isSuccess) {
      return Result.fail(saleItemResult.getError());
    }
    this.items.push(saleItemResult.getValue()!);
    this.recalculateTotal();
    return Result.ok(undefined);
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
