export class InsufficientStockError extends Error {
  constructor() {
    super("Not enough stock");
  }
}
