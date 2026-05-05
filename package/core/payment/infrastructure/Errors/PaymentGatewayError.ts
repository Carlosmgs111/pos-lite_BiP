export class PaymentGatewayUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("Payment gateway is unreachable");
    this.name = "PaymentGatewayUnreachableError";
    if (cause != null) {
      this.cause = cause;
    }
  }
}
