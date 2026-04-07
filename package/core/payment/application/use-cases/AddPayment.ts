import type { PaymentRepository } from "../../domain/PaymentRepository";
import type { PaymentProps } from "../../domain/Payment";

export class AddPayment {
  constructor(private paymentRepository: PaymentRepository) {}
  async execute(saleId: string, payment: PaymentProps) {
    const paymentOrder = await this.paymentRepository.findBySaleId(saleId);
    if (!paymentOrder) {
      throw new Error("Payment order not found");
    }
    paymentOrder.addPayment(payment);
    await this.paymentRepository.save(paymentOrder);
  }
}
