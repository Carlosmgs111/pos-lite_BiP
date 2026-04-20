import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";
import type { PaymentOrder } from "../domain/PaymentOrder";
import { Result } from "../../shared/domain/Result";

export class InMemoryPaymentOrderRepository implements PaymentOrderRepository {
  /* private */ orders: PaymentOrder[] = [];

  async save(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    this.orders.push(paymentOrder);
    return Result.ok(undefined);
  }

  async update(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    const index = this.orders.findIndex(
      (o) => o.getId().getValue() === paymentOrder.getId().getValue()
    );
    if (index === -1) {
      return Result.fail(new Error("PaymentOrder not found"));
    }
    this.orders[index] = paymentOrder;
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<Error, PaymentOrder | null>> {
    const order = this.orders.find((o) => o.getId().getValue() === id);
    return Result.ok(order ?? null);
  }

  async findBySaleId(
    saleId: string
  ): Promise<Result<Error, PaymentOrder | null>> {
    const order = this.orders.find(
      (o) => o.getSaleId().getValue() === saleId
    );
    return Result.ok(order ?? null);
  }

  purgeDb(): void {
    this.orders = [];
  }
}
