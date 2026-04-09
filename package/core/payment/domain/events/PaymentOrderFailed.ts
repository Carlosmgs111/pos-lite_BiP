export class PaymentOrderFailed {
  static readonly eventName = "PaymentOrderFailed";
  constructor(public readonly saleId: string) {}
}
