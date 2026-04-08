export class PaymentOrderComplete {
  static readonly eventName = "PaymentOrderComplete";
  constructor(public readonly saleId: string) {}
}
