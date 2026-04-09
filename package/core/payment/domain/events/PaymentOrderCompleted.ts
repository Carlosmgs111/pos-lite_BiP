export class PaymentOrderCompleted {
  static readonly eventName = "PaymentOrderCompleted";
  constructor(public readonly saleId: string) {}
}
