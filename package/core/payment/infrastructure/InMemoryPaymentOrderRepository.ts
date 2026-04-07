import type { PaymentRepository } from "../domain/PaymentRepository";
import { PaymentOrder } from "../domain/PaymentOrder";
import { Result } from "../../shared/domain/Result";

export class InMemoryPaymentOrderRepository implements PaymentRepository {
  private paymentOrders: PaymentOrder[] = [];

  async save(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    this.paymentOrders.push(paymentOrder);
    return Result.ok(undefined);
  }
  async update(deltaPaymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    const index = this.paymentOrders.findIndex(
      (po) => po.getId().getValue() === deltaPaymentOrder.getId().getValue()
    );
    if (index === -1) {
      return Result.fail(new Error("Payment order not found"));
    }
    this.paymentOrders[index] = deltaPaymentOrder;
    return Result.ok(undefined);
  }
  async delete(paymentOrderToDelete: PaymentOrder): Promise<Result<Error, void>> {
    const index = this.paymentOrders.findIndex(
      (po) => po.getId().getValue() === paymentOrderToDelete.getId().getValue()
    );
    if (index === -1) {
      return Result.fail(new Error("Payment order not found"));
    }
    this.paymentOrders.splice(index, 1);
    return Result.ok(undefined);
  }
  async findBySaleId(id: string): Promise<Result<Error, PaymentOrder | null>> {
    const paymentOrder = this.paymentOrders.find(
      (paymentOrder) => paymentOrder.getSaleId().getValue() === id
    );
    return Result.ok(paymentOrder || null);
  }
  purgeDb() {
    this.paymentOrders = [];
  }
}
