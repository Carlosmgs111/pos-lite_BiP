import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";
import type { PaymentOrder } from "../domain/PaymentOrder";
import { Result } from "../../shared/domain/Result";
import { ConcurrencyError } from "../../shared/domain/Errors/ConcurrencyError";

export class InMemoryPaymentOrderRepository implements PaymentOrderRepository {
  private orders: PaymentOrder[] = [];
  private persistedVersions = new Map<string, number>();

  async save(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    this.orders.push(paymentOrder);
    this.persistedVersions.set(
      paymentOrder.getId().getValue(),
      paymentOrder.getVersion()
    );
    return Result.ok(undefined);
  }

  async update(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    const id = paymentOrder.getId().getValue();
    const index = this.orders.findIndex(
      (o) => o.getId().getValue() === id
    );
    if (index === -1) {
      return Result.fail(new Error("PaymentOrder not found"));
    }

    const persistedVersion = this.persistedVersions.get(id) ?? 0;
    if (paymentOrder.getVersion() <= persistedVersion) {
      return Result.fail(new ConcurrencyError("PaymentOrder"));
    }

    this.orders[index] = paymentOrder;
    this.persistedVersions.set(id, paymentOrder.getVersion());
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
    this.persistedVersions.clear();
  }
}
