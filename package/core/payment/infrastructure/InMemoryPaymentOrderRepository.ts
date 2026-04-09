import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";
import { PaymentOrder } from "../domain/PaymentOrder";
import { Result } from "../../shared/domain/Result";

export class InMemoryPaymentOrderRepository implements PaymentOrderRepository {
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
  async delete(
    paymentOrderToDelete: PaymentOrder
  ): Promise<Result<Error, void>> {
    const index = this.paymentOrders.findIndex(
      (po) => po.getId().getValue() === paymentOrderToDelete.getId().getValue()
    );
    if (index === -1) {
      return Result.fail(new Error("Payment order not found"));
    }
    this.paymentOrders.splice(index, 1);
    return Result.ok(undefined);
  }
  async findBySaleId(
    saleId: string
  ): Promise<Result<Error, PaymentOrder | null>> {
    const paymentOrder = this.paymentOrders.find(
      (paymentOrder) => paymentOrder.getSaleId().getValue() === saleId
    );
    return Result.ok(paymentOrder || null);
  }
  async findByPaymentId(
    paymentId: string
  ): Promise<Result<Error, PaymentOrder | null>> {
    const paymentOrder = this.paymentOrders.find((po) =>
      po.hasPayment(paymentId)
    );
    return Result.ok(paymentOrder || null);
  }
  purgeDb() {
    this.paymentOrders = [];
  }
}
