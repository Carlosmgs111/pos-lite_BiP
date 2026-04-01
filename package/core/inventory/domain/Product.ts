
import { Result } from "../../shared/domain/Result";
import { PriceVO } from "../../shared/domain/Price.VO";
import { UuidVO } from "../../shared/domain/Uuid.VO";
import { NameVO } from "./Name.VO";

export class Product {
  constructor(
    private id: UuidVO,
    private name: NameVO,
    private price: PriceVO,
    private stock: number,
    private reservedStock: number
  ) {}
  async reserveStock(quantity: number): Promise<Result<Error, void>> {
    if (this.stock < quantity) {
      return Result.fail(new Error("Not enough stock"));
    }
    this.reservedStock += quantity;
    this.stock -= quantity;
    return Result.ok(undefined);
  }
  releaseStock(quantity: number) {
    this.reservedStock -= quantity;
    this.stock += quantity;
    return Result.ok(undefined);
  }
  confirmStock(quantity: number) {
    this.reservedStock -= quantity;
    return Result.ok(undefined);
  }
  getStock() {
    return this.stock;
  }
  canReserveStock(quantity: number) {
    return this.stock >= quantity;
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name.name;
  }
  getPrice() {
    return this.price.getValue();
  }
}
