import { PriceVO } from "../../shared/domain/Price.VO";
import { NameVO } from "./Name.VO";
import { Result } from "../../shared/domain/Result";

export class Product {
  constructor(
    private id: string,
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
