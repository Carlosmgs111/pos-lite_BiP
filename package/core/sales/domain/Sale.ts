import { SaleItem } from "./SaleItem";
import { SaleStates } from "./SaleStates";
import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";

class SaleItemNotFound extends Error {
  constructor() {
    super("Item not found");
  }
}

interface SaleProps {
  id: string;
  items: SaleItem[];
  total: PriceVO;
  createdAt: Date;
}

export class Sale {
  constructor(
    private id: string,
    private items: SaleItem[],
    private total: PriceVO,
    private createdAt: Date,
    private state: SaleStates
  ) {}
  static create(props: SaleProps) {
    return new Sale(
      props.id,
      props.items,
      props.total,
      props.createdAt,
      SaleStates.PENDING
    );
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
  addItem(item: SaleItem): void {
    const itemExists = this.findItemById(item.getId());
    if (itemExists.isSuccess) {
      itemExists
        .getValue()!
        .incrementQuantity(item.getQuantity());
    } else {
      this.items.push(item);
    }
    this.recalculateTotal();
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
