import { PaymentOrder } from "./PaymentOrder";
import { Result } from "../../shared/domain/Result";

export interface PaymentRepository {
  save(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  update(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  delete(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  findBySaleId(id: string): Promise<Result<Error, PaymentOrder | null>>;
}
