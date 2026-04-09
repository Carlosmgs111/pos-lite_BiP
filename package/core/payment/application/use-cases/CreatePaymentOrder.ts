import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { PaymentOrder } from "../../domain/PaymentOrder";
import { Result } from "../../../shared/domain/Result";

export class CreatePaymentOrder {
  constructor(private paymentRepository: PaymentOrderRepository) {}
  async execute(saleId: string, totalAmount: number): Promise<Result<Error, void>> {
    const paymentOrder = PaymentOrder.create({
      saleId,
      totalAmount,
    });
    await this.paymentRepository.save(paymentOrder);
    return Result.ok(undefined);
  }
}
