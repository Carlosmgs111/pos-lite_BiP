import { type PaymentRepository } from "../../domain/PaymentRepository";
import { type ConfirmPayment } from "../use-cases/ConfirmPayment";
import {
  type PaymentGateway,
  GatewayTransactionStatus,
} from "../../domain/PaymentGateway";
import { Result } from "../../../shared/domain/Result";

export class ReconcilePaymentOrder {
  constructor(
    private repo: PaymentRepository,
    private confirmPayment: ConfirmPayment,
    private psp: PaymentGateway
  ) {}

  async execute(paymentOrderId: string): Promise<Result<Error, void>[] | Result<Error, void>> {
    const pendingPaymentsResult =
      await this.repo.findPendingByPaymentOrderId(paymentOrderId);
    if (!pendingPaymentsResult.isSuccess) return Result.fail(pendingPaymentsResult.getError());
    const pendingPayments = pendingPaymentsResult.getValue();
    if (!pendingPayments.length) return Result.ok(void 0);

    const executeConfirmations: Promise<Result<Error, void>>[] = [];

    for (const payment of pendingPayments) {
      const externalId = payment.getExternalId();
      if (!externalId) {
        executeConfirmations.push(
          Promise.reject(Result.fail(new Error("Payment has no external ID")))
        );
        continue;
      }

      const queryResult = await this.psp.queryStatus(externalId);
      if (!queryResult.isSuccess) {
        executeConfirmations.push(
          Promise.reject(Result.fail(queryResult.getError()))
        );
        continue;
      }

      const status = queryResult.getValue();

      switch (status) {
        case GatewayTransactionStatus.APPROVED:
          executeConfirmations.push(
            this.confirmPayment.execute({
              paymentId: payment.getId().getValue(),
              success: true,
              transactionId: externalId,
            })
          );
          break;

        case GatewayTransactionStatus.DECLINED:
        case GatewayTransactionStatus.PENDING:
          break;
      }
    }

    const result = await Promise.allSettled(executeConfirmations) as unknown as Result<Error, void>[];
    console.log(result);
    return result
  }
}
