export class InvalidPaymentError extends Error {
  constructor(message: string) {
    super(message);
  }
}
