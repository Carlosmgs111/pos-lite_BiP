import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { PaymentOrder } from "../../domain/PaymentOrder";
import { Result } from "../../../shared/domain/Result";

export class CreatePaymentOrder {
  constructor(private paymentRepository: PaymentOrderRepository) {}
  async execute(saleId: string, totalAmount: number): Promise<Result<Error, void>> {
    console.log("[CreatePaymentOrder] Creating PaymentOrder for sale", saleId);
    const existing = await this.paymentRepository.findBySaleId(saleId);
    console.log("[CreatePaymentOrder] PaymentOrder found", existing);
    if (!existing.isSuccess) {
      return Result.fail(existing.getError());
    }
    if (existing.getValue() !== null) {
      return Result.fail(new Error("PaymentOrder already exists for this sale"));
    }
    const createResult = PaymentOrder.create({ saleId, totalAmount });
    if (!createResult.isSuccess) {
      return Result.fail(createResult.getError());
    }
    console.log("[CreatePaymentOrder] PaymentOrder created", createResult);
    await this.paymentRepository.save(createResult.getValue());
    return Result.ok(undefined);
  }
}
