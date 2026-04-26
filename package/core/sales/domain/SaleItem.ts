import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import { InvalidQuantityError } from "./Errors/InvalidQuantityError";

export interface SaleItemProps {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: number;
}
export class SaleItem {
  private constructor(
    private productId: string,
    private nameSnapshot: string,
    private quantity: number,
    private priceSnapshot: PriceVO,
    private subTotal: PriceVO
  ) {}

  static create(props: SaleItemProps): Result<InvalidQuantityError, SaleItem> {
    if (props.quantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Quantity must be greater than 0")
      );
    }
    const price = new PriceVO(props.priceSnapshot);
    const subTotal = PriceVO.multiply(price, props.quantity);
    return Result.ok(
      new SaleItem(
        props.productId,
        props.nameSnapshot,
        props.quantity,
        price,
        subTotal
      )
    );
  }

  getProductId() {
    return this.productId;
  }
  getNameSnapshot() {
    return this.nameSnapshot;
  }
  getPriceSnapshot() {
    return this.priceSnapshot;
  }

  incrementQuantity(quantity: number): Result<InvalidQuantityError, void> {
    if (quantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Quantity must be greater than 0")
      );
    }
    this.quantity += quantity;
    this.subTotal = PriceVO.multiply(this.priceSnapshot, this.quantity);
    return Result.ok(undefined);
  }

  decrementQuantity(quantity: number): Result<InvalidQuantityError, void> {
    const newQuantity = this.quantity - quantity;
    if (newQuantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Resulting quantity cannot be negative")
      );
    }
    this.quantity = newQuantity;
    this.subTotal = PriceVO.multiply(this.priceSnapshot, this.quantity);
    return Result.ok(undefined);
  }

  getSubTotal() {
    return this.subTotal;
  }
  getQuantity() {
    return this.quantity;
  }
  serialize() {
    return {
      productId: this.productId,
      nameSnapshot: this.nameSnapshot,
      quantity: this.quantity,
      priceSnapshot: this.priceSnapshot.getValue(),
      subTotal: this.subTotal.getValue(),
    };
  }
}
