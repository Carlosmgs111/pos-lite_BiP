import type { PaymentOrder } from "./PaymentOrder";
import type { Result } from "../../shared/domain/Result";

export interface PaymentOrderRepository {
  save(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  update(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  findById(id: string): Promise<Result<Error, PaymentOrder | null>>;
  findBySaleId(saleId: string): Promise<Result<Error, PaymentOrder | null>>;
}
