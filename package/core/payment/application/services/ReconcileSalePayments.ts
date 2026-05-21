import { type PaymentRepository } from "../../domain/PaymentRepository";
import { type PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { type ConfirmPayment } from "../use-cases/ConfirmPayment";
import { type ProcessPayment } from "../use-cases/ProcessPayment";
import {
  type PaymentGateway,
  GatewayTransactionStatus,
} from "../../domain/PaymentGateway";
import { Result } from "../../../shared/domain/Result";

export class ReconcileSalePayments {
  constructor(
    private repo: PaymentRepository,
    private paymentOrderRepo: PaymentOrderRepository,
    private confirmPayment: ConfirmPayment,
    private processPayment: ProcessPayment,
    private psp: PaymentGateway
  ) {}

  async execute(
    saleId: string
  ): Promise<Result<Error, void>[] | Result<Error, void>> {
    const paymentOrderResult = await this.paymentOrderRepo.findBySaleId(saleId);
    if (!paymentOrderResult.isSuccess)
      return Result.fail(paymentOrderResult.getError());
    const paymentOrder = paymentOrderResult.getValue();
    if (!paymentOrder) {
      return Result.fail(new Error("Payment order not found"));
    }
    const pendingPaymentsResult = await this.repo.findPendingByPaymentOrderId(
      paymentOrder.getId().getValue()
    );
    if (!pendingPaymentsResult.isSuccess)
      return Result.fail(pendingPaymentsResult.getError());
    const pendingPayments = pendingPaymentsResult.getValue();
    if (!pendingPayments.length) return Result.ok(void 0);

    // ? Se podrian usar para llevar control del resultado de las reconciliaciones
    const executeConfirmations: Promise<Result<Error, void>>[] = [];

    for (const payment of pendingPayments) {
      let externalId = payment.getExternalId();
      // ? Aqui recupera el flujo que debia haberse ejecutado donde ejecutaba la peticion y obtenia el externalId
      if (!externalId) {
        const paymentRequest = {
          paymentId: payment.getId().getValue(),
          amount: payment.getAmount().getValue(),
          method: payment.getMethod(),
        };
        externalId = (
          await this.processPayment.execute(
            payment.getId().getValue(),
            paymentRequest
          )
        ).getValue();
        executeConfirmations.push(Promise.resolve(Result.ok(void 0)));
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
        case GatewayTransactionStatus.DECLINED:
          executeConfirmations.push(
            this.confirmPayment.execute({
              paymentId: payment.getId().getValue(),
              success: status === GatewayTransactionStatus.APPROVED,
              transactionId: externalId,
            })
          );
          break;
        case GatewayTransactionStatus.PENDING:
          break;
      }
    }

    const result = (await Promise.allSettled(
      executeConfirmations
    )) as unknown as Result<Error, void>[];
    console.log({ result });
    return result;
  }
}
