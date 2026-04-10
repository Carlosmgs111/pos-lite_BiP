import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { PaymentOrder } from "../../domain/PaymentOrder";
import { Result } from "../../../shared/domain/Result";

export class CreatePaymentOrder {
  constructor(private paymentRepository: PaymentOrderRepository) {}
  async execute(saleId: string, totalAmount: number): Promise<Result<Error, void>> {
    const existing = await this.paymentRepository.findBySaleId(saleId);
    if (existing.isSuccess && existing.getValue() !== null) {
      return Result.fail(new Error("PaymentOrder already exists for this sale"));
    }
    const createResult = PaymentOrder.create({ saleId, totalAmount });
    if (!createResult.isSuccess) {
      return Result.fail(createResult.getError());
    }
    await this.paymentRepository.save(createResult.getValue()!);
    return Result.ok(undefined);
  }
}
