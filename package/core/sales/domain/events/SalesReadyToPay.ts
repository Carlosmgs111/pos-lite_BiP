export class SalesReadyToPay{
  static readonly eventName = "SalesReadyToPay";
  constructor(
    public readonly saleId: string,
    public readonly totalAmount: number
  ) {}
}
