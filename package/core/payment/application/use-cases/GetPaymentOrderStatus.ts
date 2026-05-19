import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import type { Payment } from "../../domain/Payment";
import type { PaymentOrder } from "../../domain/PaymentOrder";
import type { PaymentOrderSnapshot } from "../../domain/PaymentOrderProjectionService";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderProjectionService } from "../../domain/PaymentOrderProjectionService";

// 🛠️ FASE 13: GetPaymentOrderStatus — Nuevo query use case
// ! [ANTES] El endpoint /api/payment/status accedía directamente a los repos sin proyección
// ? [DESPUÉS] GetPaymentOrderStatus retorna order + snapshot financiero + payments completos

export class GetPaymentOrderStatus {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private paymentRepository: PaymentRepository
  ) {}

  async execute(saleId: string): Promise<Result<Error, {
    order: PaymentOrder;
    snapshot: PaymentOrderSnapshot;
    payments: Payment[];
  }>> {
    const orderResult = await this.paymentOrderRepository.findBySaleId(saleId);
    if (!orderResult.isSuccess || !orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const order = orderResult.getValue()!;

    const paymentsResult = await this.paymentRepository.findByPaymentOrderId(
      order.getId().getValue()
    );
    const payments = paymentsResult.isSuccess
      ? paymentsResult.getValue()
      : [];
    const snapshot = PaymentOrderProjectionService.project(
      order.getTotalAmount(),
      payments
    );

    return Result.ok({ order, snapshot, payments });
  }
}
