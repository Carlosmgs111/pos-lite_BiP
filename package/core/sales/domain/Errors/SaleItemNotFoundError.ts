export class SaleItemNotFoundError extends Error {
  constructor() {
    super("Item not found");
  }
}
