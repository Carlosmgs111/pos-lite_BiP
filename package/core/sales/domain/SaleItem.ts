import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";

class InvalidQuantityError extends Error {
  constructor(message: string) {
    super(message);
  }
}

interface SaleItemProps {
  id: string;
  productName: string;
  quantity: number;
  price: PriceVO;
  total: PriceVO;
}
export class SaleItem {
  private constructor(
    private id: string,
    private productName: string,
    private quantity: number,
    private price: PriceVO,
    private total: PriceVO
  ) {}

  static create(props: SaleItemProps): Result<InvalidQuantityError, SaleItem> {
    if (props.quantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Quantity must be greater than 0")
      );
    }
    return Result.ok(
      new SaleItem(
        props.id,
        props.productName,
        props.quantity,
        props.price,
        props.total
      )
    );
  }

  getId() {
    return this.id;
  }
  getProductName() {
    return this.productName;
  }
  getPrice() {
    return this.price;
  }

  incrementQuantity(quantity: number) {
    this.quantity += quantity;
    this.total = PriceVO.multiply(this.price, this.quantity);
  }

  decrementQuantity(quantity: number): Result<InvalidQuantityError, void> {
    const newQuantity = this.quantity - quantity;
    if (newQuantity < 0) {
      return Result.fail(
        new InvalidQuantityError("Resulting quantity cannot be negative")
      );
    }
    this.quantity = newQuantity;
    this.total = PriceVO.multiply(this.price, this.quantity);
    return Result.ok();
  }

  getTotal() {
    return this.total;
  }
  getQuantity() {
    return this.quantity;
  }
}
