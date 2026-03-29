export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found");
    Object.setPrototypeOf(this, ProductNotFoundError.prototype);
  }
}
