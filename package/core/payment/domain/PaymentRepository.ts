import { PaymentOrder } from "./PaymentOrder";

export interface PaymentRepository {
  save(paymentOrder: PaymentOrder): Promise<void>;
  update(paymentOrder: PaymentOrder): Promise<void>;
  delete(paymentOrder: PaymentOrder): Promise<void>;
  findBySaleId(id: string): Promise<PaymentOrder | null>;
}
