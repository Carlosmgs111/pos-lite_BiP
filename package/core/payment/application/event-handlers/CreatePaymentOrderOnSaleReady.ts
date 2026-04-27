import type { EventHandler } from "../../../shared/domain/bus/EventHandler";
import type { SalesReadyToPay } from "../../../sales";
import type { CreatePaymentOrder } from "../../application/use-cases/CreatePaymentOrder";
import { Result } from "../../../shared/domain/Result";

export class CreatePaymentOrderOnSaleReady implements EventHandler<SalesReadyToPay> {
  constructor(private createPaymentOrder: CreatePaymentOrder) {}
  async handle(event: SalesReadyToPay): Promise<Result<Error, void>> {
    const { saleId, totalAmount } = event.payload;
    const result = await this.createPaymentOrder.execute(saleId, totalAmount);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    return Result.ok(undefined);
  }
}
