import { PriceVO } from "../../shared/domain/Price.VO";

export class OrderItem {
  constructor(
    private id: string,
    private productName: string,
    private quantity: number,
    private price: PriceVO,
    private total: PriceVO
  ) {}

  getId() {
    return this.id;
  }

  incrementQuantity(quantity: number) {
    this.quantity= this.quantity + quantity;
    this.total = PriceVO.multiply(this.price, this.quantity);
  }

  decrementQuantity(quantity: number) {
    this.quantity= this.quantity - quantity;
    this.total = PriceVO.multiply(this.price, this.quantity);
  }

  getTotal() {
    return this.total;
  }
  getQuantity() {
    return this.quantity;
  }
}
