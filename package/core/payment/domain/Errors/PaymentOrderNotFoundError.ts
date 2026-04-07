export class PaymentOrderNotFoundError extends Error {
  constructor() {
    super("Payment order not found");
  }
}
