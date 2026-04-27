import type { PaymentRepository } from "../domain/PaymentRepository";
import type { Payment } from "../domain/Payment";
import { Result } from "../../shared/domain/Result";
import { ConcurrencyError } from "../../shared/domain/Errors/ConcurrencyError";

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Payment[] = [];
  private persistedVersions = new Map<string, number>();

  async save(payment: Payment): Promise<Result<Error, void>> {
    this.payments.push(payment);
    this.persistedVersions.set(
      payment.getId().getValue(),
      payment.getVersion()
    );
    return Result.ok(undefined);
  }

  async update(payment: Payment): Promise<Result<Error, void>> {
    const id = payment.getId().getValue();
    const index = this.payments.findIndex(
      (p) => p.getId().getValue() === id
    );
    if (index === -1) {
      return Result.fail(new Error("Payment not found"));
    }

    const persistedVersion = this.persistedVersions.get(id) ?? 0;
    if (payment.getVersion() !== persistedVersion + 1) {
      return Result.fail(new ConcurrencyError("Payment"));
    }

    this.payments[index] = payment;
    this.persistedVersions.set(id, payment.getVersion());
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<Error, Payment | null>> {
    const payment = this.payments.find(
      (p) => p.getId().getValue() === id
    );
    if (!payment) {
      return Result.fail(new Error("Payment not found"));
    }
    return Result.ok(payment);
  }

  async findByPaymentOrderId(orderId: string): Promise<Result<Error, Payment[]>> {
    const payments = this.payments.filter(
      (p) => p.getPaymentOrderId() === orderId
    );
    return Result.ok(payments);
  }

  async findByExternalId(externalId: string): Promise<Result<Error, Payment | null>> {
    const payment = this.payments.find(
      (p) => p.getExternalId() === externalId
    );
    return Result.ok(payment ?? null);
  }

  purgeDb(): void {
    this.payments = [];
    this.persistedVersions.clear();
  }
}
