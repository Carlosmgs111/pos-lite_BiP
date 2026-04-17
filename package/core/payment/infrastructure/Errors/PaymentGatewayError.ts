export class PaymentGatewayUnreachableError extends Error {
  constructor() {
    super("Payment gateway is unreachable");
  }
}
