import { Result } from "./Result";
import { InvalidPriceOperationError } from "./Errors/InvalidPriceOperationError";

export class PriceVO {
  private readonly value: number;
  private readonly centsPrecision: number = 2;

  constructor(price: number) {
    this.validate(price);
    this.value = this.convertToCents(price);
    return this;
  }

  static add(prices: PriceVO[]): PriceVO {
    const totalCents = prices.reduce(
      (total, price) => total + price.getValueInCents(),
      0
    );
    return new PriceVO(totalCents / 100);
  }

  static substract(priceBase: PriceVO, prices: PriceVO[]): Result<Error, PriceVO> {
    const totalToSubstract = prices.reduce(
      (total, price) => total + price.getValueInCents(),
      0
    );
    if (totalToSubstract > priceBase.getValueInCents()) {
      return Result.fail(new InvalidPriceOperationError());
    }
    const totalCents = priceBase.getValueInCents() - totalToSubstract;
    return Result.ok(new PriceVO(totalCents / 100));
  }

  static multiply(price: PriceVO, quantity: number): PriceVO {
    return new PriceVO(price.getValueInCents() * quantity / 100);
  }

  private convertToDecimals(cents: number): number {
    return cents / 100;
  }

  private validate(price: number): void {
    if (!Number.isFinite(price)) {
      throw new Error("Price must be a finite number");
    }
    if (isNaN(price)) {
      throw new Error("Price must be a number");
    }
    if (price < 0) {
      throw new Error("Price must not be negative");
    }
    if (
      !Number.isInteger(price) &&
      String(price.toFixed(this.centsPrecision + 1)).split(".")[1].length > this.centsPrecision
    ) {
      throw new Error("Price must have at most 2 decimal places");
    }
  }

  private convertToCents(price: number): number {
    if (!Number.isInteger(price)) {
      return Number(
        String(price.toFixed(this.centsPrecision)).split(".").join("")
      );
    }
    return price * 100;
  }

  getValue(): number {
    return this.convertToDecimals(this.value);
  }
  getValueInCents(): number {
    return this.value;
  }
}
