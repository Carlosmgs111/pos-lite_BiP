import type { Payment } from "./Payment";
import type { Result } from "../../shared/domain/Result";

export interface PaymentRepository {
  save(payment: Payment): Promise<Result<Error, void>>;
  update(payment: Payment): Promise<Result<Error, void>>;
  findById(id: string): Promise<Result<Error, Payment | null>>;
  findByPaymentOrderId(orderId: string): Promise<Result<Error, Payment[]>>;
  findByExternalId(externalId: string): Promise<Result<Error, Payment | null>>;
}
