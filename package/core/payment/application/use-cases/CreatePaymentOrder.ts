import type { PaymentRepository } from "../../domain/PaymentRepository";
import { PaymentOrder } from "../../domain/PaymentOrder";

export class CreatePaymentOrder {
  constructor(private paymentRepository: PaymentRepository) {}
  async execute(saleId: string, totalAmount: number) {
    const paymentOrder = PaymentOrder.create({
      saleId,
      totalAmount,
    });
    await this.paymentRepository.save(paymentOrder);
  }
}
