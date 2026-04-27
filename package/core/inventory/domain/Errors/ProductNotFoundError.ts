export class ProductNotFoundError extends Error {
  constructor(id?: string) {
    super(`Product not found${id ? `: ${id}` : ""}`);
    Object.setPrototypeOf(this, ProductNotFoundError.prototype);
  }
}
