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
    paymentId: string,
    transactionId: string
  ): Promise<Result<Error, GatewayTransactionStatus>> {
    let status: GatewayTransactionStatus;
    try {
      status = await this.gateway.queryStatus(transactionId);
    } catch (err) {
      return Result.fail(err as Error);
    }

    if (status === GatewayTransactionStatus.SUCCEEDED) {
      await this.confirmPayment.execute(paymentId, true);
    } else if (status === GatewayTransactionStatus.FAILED) {
      await this.confirmPayment.execute(paymentId, false);
    }

    return Result.ok(status);
  }
}
