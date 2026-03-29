export class PriceVO {
  private readonly value: number;
  private readonly centsPrecision: number = 2;    

  constructor(price: number) {
    this.validate(price);
    this.value = this.convertToCents(price);
    return this;
  }

  static add(prices: PriceVO[]): PriceVO {
    const totalCents = prices.reduce((total, price) => total + price.getValue(), 0);
    return new PriceVO(totalCents);
  }

  static multiply(price: PriceVO, quantity: number): PriceVO {
    return new PriceVO(price.getValue() * quantity);
  }

  private convertToDecimals(cents: number): number {
    return cents / 100;
  }

  private validate(price: number): void {
    if (isNaN(price)) {
      throw new Error("Price must be a number");
    }
    if (price < 0) {
      throw new Error("Price must be greater than 0");
    }
    if (
      !Number.isInteger(price) &&
      String(price).split(".")[1].length > this.centsPrecision
    ) {
      throw new Error("Price must have at most 2 decimal places");
    }
  }

  private convertToCents(price: number): number {
    if (!Number.isInteger(price)) {
      return Number(String(price.toFixed(this.centsPrecision)).split(".").join(""));
    }
    return price * 100;
  }

  getValue(): number {
    return this.convertToDecimals(this.value);
  }
}
