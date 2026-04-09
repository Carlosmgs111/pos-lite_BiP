import { PaymentOrder } from "./PaymentOrder";
import { Result } from "../../shared/domain/Result";

export interface PaymentOrderRepository {
  save(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  update(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  delete(paymentOrder: PaymentOrder): Promise<Result<Error, void>>;
  findBySaleId(saleId: string): Promise<Result<Error, PaymentOrder | null>>;
  findByPaymentId(paymentId: string): Promise<Result<Error, PaymentOrder | null>>;
}
