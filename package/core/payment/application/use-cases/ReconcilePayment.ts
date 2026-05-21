import {
  type PaymentGateway,
  GatewayTransactionStatus,
} from "../../domain/PaymentGateway";
import type { ConfirmPayment } from "./ConfirmPayment";
import { Result } from "../../../shared/domain/Result";

export class ReconcilePayment {
  constructor(
    private gateway: PaymentGateway,
    private confirmPayment: ConfirmPayment
  ) {}

  async execute(
    transactionId: string
  ): Promise<Result<Error, GatewayTransactionStatus>> {
    const queryResult = await this.gateway.queryStatus(transactionId);
    if (!queryResult.isSuccess) {
      return Result.fail(queryResult.getError());
    }
    const status = queryResult.getValue();
   

    // Only confirm on terminal gateway statuses. PENDING / TIMEOUT / NOT_FOUND are
    // non-terminal — return the status to the caller without mutating the Payment.
    if (
      status !== GatewayTransactionStatus.APPROVED &&
      status !== GatewayTransactionStatus.DECLINED
    ) {
      return Result.ok(status);
    }

    const success = status === GatewayTransactionStatus.APPROVED;
    const confirmResult = await this.confirmPayment.execute({
      transactionId,
      success,
    });
    if (!confirmResult.isSuccess) {
      return Result.fail(confirmResult.getError());
    }

    return Result.ok(status);
  }
}
