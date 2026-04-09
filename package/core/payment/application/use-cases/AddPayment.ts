import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentProps } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";

export class AddPayment {
  constructor(private paymentRepository: PaymentOrderRepository) {}
  async execute(
    saleId: string,
    payment: PaymentProps
  ): Promise<Result<Error, string>> {
    const paymentOrderResult = await this.paymentRepository.findBySaleId(saleId);
    if (!paymentOrderResult.isSuccess) {
      return Result.fail(paymentOrderResult.getError());
    }
    if (!paymentOrderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = paymentOrderResult.getValue()!;
    const addResult = paymentOrder.addPayment(payment);
    if (!addResult.isSuccess) {
      return Result.fail(addResult.getError());
    }
    await this.paymentRepository.update(paymentOrder);
    return Result.ok(addResult.getValue()!.getId().getValue());
  }
}
