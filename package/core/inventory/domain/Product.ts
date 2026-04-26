import { Result } from "../../shared/domain/Result";
import { PriceVO } from "../../shared/domain/Price.VO";
import { UuidVO } from "../../shared/domain/Uuid.VO";
import { NameVO } from "./Name.VO";
import { InsufficientStockError } from "./Errors/InsufficientStockError";
import { InvalidStockOperationError } from "./Errors/InvalidStockOperationError";

export interface ProductProps {
  id: string;
  name: string;
  price: number;
  stock: number;
  reservedStock: number;
}

export class Product {
  private constructor(
    private id: UuidVO,
    private name: NameVO,
    private price: PriceVO,
    private stock: number,
    private reservedStock: number,
    private version: number
  ) {}
  static create(props: ProductProps) {
    return new Product(
      new UuidVO(props.id),
      new NameVO(props.name),
      new PriceVO(props.price),
      props.stock,
      props.reservedStock,
      0
    );
  }
  reserveStock(quantity: number): Result<InsufficientStockError, void> {
    if (this.stock < quantity) {
      return Result.fail(new InsufficientStockError());
    }
    this.reservedStock += quantity;
    this.stock -= quantity;
    this.version++;
    return Result.ok(undefined);
  }
  releaseStock(quantity: number): Result<InvalidStockOperationError, void> {
    if (quantity > this.reservedStock) {
      return Result.fail(new InvalidStockOperationError("Cannot release more stock than reserved"));
    }
    this.reservedStock -= quantity;
    this.stock += quantity;
    this.version++;
    return Result.ok(undefined);
  }
  commitStock(quantity: number): Result<InvalidStockOperationError, void> {
    if (quantity > this.reservedStock) {
      return Result.fail(new InvalidStockOperationError("Cannot commit more stock than reserved"));
    }
    this.reservedStock -= quantity;
    this.version++;
    return Result.ok(undefined);
  }
  revertCommit(quantity: number): Result<InvalidStockOperationError, void> {
    if (quantity <= 0) {
      return Result.fail(new InvalidStockOperationError("Quantity to revert must be positive"));
    }
    this.reservedStock += quantity;
    this.version++;
    return Result.ok(undefined);
  }
  restoreStock(quantity: number): Result<InvalidStockOperationError, void> {
    if (quantity <= 0) {
      return Result.fail(new InvalidStockOperationError("Quantity to restore must be positive"));
    }
    this.stock += quantity;
    this.version++;
    return Result.ok(undefined);
  }
  getVersion() {
    return this.version;
  }
  getStock() {
    return this.stock;
  }
  getReservedStock() {
    return this.reservedStock;
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
