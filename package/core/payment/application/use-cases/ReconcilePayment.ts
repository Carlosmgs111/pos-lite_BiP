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
    let status: GatewayTransactionStatus;
    try {
      status = await this.gateway.queryStatus(transactionId);
    } catch (err) {
      return Result.fail(err as Error);
    }

    // Only confirm on terminal gateway statuses. PENDING / TIMEOUT / NOT_FOUND are
    // non-terminal — return the status to the caller without mutating the Payment.
    if (
      status !== GatewayTransactionStatus.SUCCEEDED &&
      status !== GatewayTransactionStatus.FAILED
    ) {
      return Result.ok(status);
    }

    const success = status === GatewayTransactionStatus.SUCCEEDED;
    const confirmResult = await this.confirmPayment.execute({
      transactionId,
      success,
    });
    if (!confirmResult.isSuccess) {
      return Result.fail(confirmResult.getError()!);
    }

    return Result.ok(status);
  }
}
