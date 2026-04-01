export class SaleNotFoundError extends Error {
  constructor() {
    super("Sale not found");
  }
}