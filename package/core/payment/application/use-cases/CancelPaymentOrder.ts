import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";

export class CancelPaymentOrder {
  constructor(private paymentRepository: PaymentOrderRepository) {}
  async execute(saleId: string): Promise<Result<Error, void>> {
    const orderResult = await this.paymentRepository.findBySaleId(saleId);
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = orderResult.getValue()!;
    const cancelResult = paymentOrder.cancel();
    if (!cancelResult.isSuccess) {
      return Result.fail(cancelResult.getError());
    }
    await this.paymentRepository.update(paymentOrder);
    return Result.ok(undefined);
  }
}
