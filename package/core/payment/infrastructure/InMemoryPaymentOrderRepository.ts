import type { PaymentRepository } from "../domain/PaymentRepository";
import { PaymentOrder } from "../domain/PaymentOrder";

export class InMemoryPaymentOrderRepository implements PaymentRepository {
  private paymentOrders: PaymentOrder[] = [];

  async save(paymentOrder: PaymentOrder): Promise<void> {
    this.paymentOrders.push(paymentOrder);
  }
  async update(deltaPaymentOrder: PaymentOrder): Promise<void> {
    const index = this.paymentOrders.findIndex(
      (paymentOrder) =>
        paymentOrder.getId().getValue() === deltaPaymentOrder.getId().getValue()
    );
    if (index === -1) {
      throw new Error("Payment order not found");
    }
    this.paymentOrders[index] = deltaPaymentOrder;
  }
  async delete(paymentOrder: PaymentOrder): Promise<void> {
    const index = this.paymentOrders.findIndex(
      (paymentOrder) =>
        paymentOrder.getId().getValue() === paymentOrder.getId().getValue()
    );
    if (index === -1) {
      throw new Error("Payment order not found");
    }
    this.paymentOrders.splice(index, 1);
  }
  async findBySaleId(id: string): Promise<PaymentOrder | null> {
    const paymentOrder = this.paymentOrders.find(
      (paymentOrder) => paymentOrder.getSaleId().getValue() === id
    );
    return paymentOrder || null;
  }
  purgeDb() {
    this.paymentOrders = [];
  }
}
