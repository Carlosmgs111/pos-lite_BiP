import type { PaymentRepository } from "../../domain/PaymentRepository";
import { PaymentOrder } from "../../domain/PaymentOrder";
import { Result } from "../../../shared/domain/Result";

export class CreatePaymentOrder {
  constructor(private paymentRepository: PaymentRepository) {}
  async execute(saleId: string, totalAmount: number): Promise<Result<Error, void>> {
    const paymentOrder = PaymentOrder.create({
      saleId,
      totalAmount,
    });
    await this.paymentRepository.save(paymentOrder);
    return Result.ok(undefined);
  }
}
