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
  static reconstitute(props: {
    id: string;
    items: Array<SaleItemProps & { subTotal: number }>;
    total: number;
    createdAt: Date;
    status: SaleStatus;
    version: number;
  }): Sale {
    const saleItems = props.items.map((item) => SaleItem.reconstitute(item));
    return new Sale(
      new UuidVO(props.id),
      saleItems,
      new PriceVO(props.total),
      new Date(props.createdAt),
      props.status,
      props.version
    );
  }
  private findItemById(id: string): Result<SaleItemNotFoundError, SaleItem> {
    const item = this.items.find((item) => item.getProductId() === id);
    if (!item) {
      return Result.fail(new SaleItemNotFoundError());
    }
    return Result.ok(item);
  }
  getItemByProductId(productId: string): SaleItem | undefined {
    return this.items.find((i) => i.getProductId() === productId);
  }
  setItemQuantity(
    productId: string,
    info: { name: string; price: number },
    quantity: number
  ): Result<Error, void> {
    if (this.status !== SaleStatus.DRAFT) {
      return Result.fail(new InvalidSaleStateError("Can only modify items in a draft sale"));
    }
    if (quantity < 0) {
      return Result.fail(new InvalidSaleStateError("Quantity cannot be negative"));
    }

    const existing = this.getItemByProductId(productId);

    if (!existing) {
      if (quantity === 0) return Result.ok(undefined);
      const itemResult = SaleItem.create({
        productId,
        nameSnapshot: info.name,
        quantity,
        priceSnapshot: info.price,
      });
      if (!itemResult.isSuccess) return Result.fail(itemResult.getError());
      this.items.push(itemResult.getValue()!);
    } else if (quantity === 0) {
      const idx = this.items.indexOf(existing);
      this.items.splice(idx, 1);
    } else {
      const setResult = existing.setQuantity(quantity);
      if (!setResult.isSuccess) return Result.fail(setResult.getError());
    }

    this.recalculateTotal();
    this.version++;
    return Result.ok(undefined);
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
  getId() {
    return this.id;
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
