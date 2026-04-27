import { SaleItem } from "./SaleItem";
import { SaleStatus } from "./SaleStatus";
import { PriceVO } from "../../shared/domain/Price.VO";
import { UuidVO } from "../../shared/domain/Uuid.VO";
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
    private id: UuidVO,
    private readonly items: SaleItem[],
    private total: PriceVO,
    private createdAt: Date,
    private status: SaleStatus,
    private version: number
  ) {}
  static create(props: SaleProps): Result<Error, Sale> {
    let id: UuidVO;
    try { 
      id = new UuidVO(props.id);
    } catch (err) {
      return Result.fail(err as Error);
    }
    const saleItems: SaleItem[] = [];
    for (const item of props.items) {
      const saleItemResult = SaleItem.create(item);
      if (!saleItemResult.isSuccess) {
        return Result.fail(saleItemResult.getError());
      }
      saleItems.push(saleItemResult.getValue()!);
    }
    const sale = new Sale(
      id,
      saleItems,
      PriceVO.add(saleItems.map((item) => item.getSubTotal())),
      props.createdAt,
      SaleStatus.DRAFT,
      0
    );
    return Result.ok(sale);
  }
  private findItemById(id: string): Result<SaleItemNotFoundError, SaleItem> {
    const item = this.items.find((item) => item.getProductId() === id);
    if (!item) {
      return Result.fail(new SaleItemNotFoundError());
    }
    return Result.ok(item);
  }
  canAddItem(): Result<InvalidSaleStateError, void> {
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(
        new InvalidSaleStateError("Can only add items to a draft sale")
      );
    }
    return Result.ok(undefined);
  }
  recalculateTotal(): void {
    this.total = PriceVO.add(this.items.map((item) => item.getSubTotal()));
  }
  getId(): string {
    return this.id.getValue();
  }
  getStatus() {
    return this.status;
  }
  getVersion() {
    return this.version;
  }
  confirmSale(): Result<InvalidSaleStateError, void> {
    if (this.items.length === 0) {
      return Result.fail(
        new InvalidSaleStateError("Can only confirm a sale with items")
      );
    }
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(
        new InvalidSaleStateError("Can only confirm a draft sale")
      );
    }
    this.status = SaleStatus.READY_TO_PAY;
    this.version++;
    return Result.ok(undefined);
  }
  completeSale(): Result<InvalidSaleStateError, void> {
    if (this.status !== SaleStatus.READY_TO_PAY) {
      return Result.fail(
        new InvalidSaleStateError(
          "Can only complete a sale that is ready to pay"
        )
      );
    }
    this.status = SaleStatus.COMPLETED;
    this.version++;
    return Result.ok(undefined);
  }
  cancelSale(): Result<InvalidSaleStateError, void> {
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(
        new InvalidSaleStateError("Can only cancel a draft sale")
      );
    }
    this.status = SaleStatus.CANCELLED;
    this.version++;
    return Result.ok(undefined);
  }
  failSale(): Result<InvalidSaleStateError, void> {
    if (this.status !== SaleStatus.READY_TO_PAY) {
      return Result.fail(
        new InvalidSaleStateError("Can only fail a sale that is ready to pay")
      );
    }
    this.status = SaleStatus.CANCELLED;
    this.version++;
    return Result.ok(undefined);
  }
  addItem(item: SaleItemProps): Result<Error, void> {
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(
        new InvalidSaleStateError("Can only add items to a draft sale")
      );
    }
    const itemExists = this.findItemById(item.productId);
    if (itemExists.isSuccess) {
      const incrementResult = itemExists
        .getValue()!
        .incrementQuantity(item.quantity);
      if (!incrementResult.isSuccess) {
        return Result.fail(incrementResult.getError());
      }
      this.recalculateTotal();
      this.version++;
      return Result.ok(undefined);
    }
    const saleItemResult = SaleItem.create(item);
    if (!saleItemResult.isSuccess) {
      return Result.fail(saleItemResult.getError());
    }
    this.items.push(saleItemResult.getValue()!);
    this.recalculateTotal();
    this.version++;
    return Result.ok(undefined);
  }
  removeItem(item: { itemId: string; quantity: number }): Result<Error, void> {
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(
        new InvalidSaleStateError("Can only remove items from a draft sale")
      );
    }
    const itemExists = this.findItemById(item.itemId);
    if (!itemExists.isSuccess) {
      return Result.fail(itemExists.getError());
    }
    const itemExistsResult = itemExists.getValue();
    if (itemExistsResult.getQuantity() - item.quantity <= 0) {
      this.items.splice(this.items.indexOf(itemExistsResult), 1);
    } else {
      itemExistsResult.decrementQuantity(item.quantity);
    }
    this.recalculateTotal();
    this.version++;
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
      id: this.id.getValue(),
      items: this.items.map(i => i.serialize()),
      total: this.total.getValue(),
      createdAt: this.createdAt,
      status: this.status,
    };
  }
}
