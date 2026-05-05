import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrder";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../../domain/events/PaymentOrderFailed";
import { PaymentTransactionResult } from "../../domain/events/PaymentTransactionResult";
import type { EventBus } from "../../../shared/domain/bus/EventBus";
import { Payment } from "../../domain/Payment";

const MAX_FAILED_ATTEMPTS = 3;

type ConfirmPaymentInput = {
  paymentId?: string;
  transactionId?: string;
  success: boolean;
};

export class ConfirmPayment {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private paymentRepository: PaymentRepository,
    private eventBus: EventBus
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<Result<Error, void>> {
    if (!input.paymentId && !input.transactionId) {
      return Result.fail(new Error("Payment ID or Transaction ID is required"));
    }
    let paymentResult!: Result<Error, Payment | null>;
    if (input.paymentId) {
      paymentResult = await this.paymentRepository.findById(input.paymentId);
    }
    if (input.transactionId) {
      paymentResult = await this.paymentRepository.findByExternalId(
        input.transactionId
      );
    }
    console.log("[ConfirmPayment] Payment found", paymentResult);
    if (!paymentResult.isSuccess) return Result.fail(paymentResult.getError());
    if (!paymentResult.getValue()) {
      return Result.fail(new Error("Payment not found"));
    }
    const payment = paymentResult.getValue()!;

    const orderResult = await this.paymentOrderRepository.findById(
      payment.getPaymentOrderId()
    );
    console.log("[ConfirmPayment] PaymentOrder found", orderResult);
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const order = orderResult.getValue()!;

    const transitionResult = input.success
      ? payment.complete()
      : payment.fail();
    if (!transitionResult.isSuccess) {
      return Result.fail(transitionResult.getError());
    }

    const amount = payment.getAmount().getValue();
    if (input.success) {
      const applyPaymentResult = order.applyPayment(amount);
      console.log("[ConfirmPayment] Payment applied", applyPaymentResult);
      if (!applyPaymentResult.isSuccess)
        return Result.fail(applyPaymentResult.getError());
    } else {
      const registerFailedAttemptResult = order.registerFailedAttempt(amount);
      console.log("[ConfirmPayment] Payment failed", registerFailedAttemptResult);
      if (!registerFailedAttemptResult.isSuccess)
        return Result.fail(registerFailedAttemptResult.getError());
    }

    let orderTerminalEvent: PaymentOrderCompleted | PaymentOrderFailed | null =
      null;
    if (order.getStatus() === PaymentOrderStatus.COMPLETED) {
      orderTerminalEvent = PaymentOrderCompleted.create({
        aggregateId: order.getId().getValue(),
        version: order.getVersion(),
        saleId: order.getSaleId().getValue(),
      });
    } else if (
      !input.success &&
      order.getFailedAttempts() >= MAX_FAILED_ATTEMPTS
    ) {
      const failResult = order.markAsFailed();
      console.log("[ConfirmPayment] Payment failed", failResult);
      if (!failResult.isSuccess) return Result.fail(failResult.getError());
      orderTerminalEvent = PaymentOrderFailed.create({
        aggregateId: order.getId().getValue(),
        version: order.getVersion(),
        saleId: order.getSaleId().getValue(),
      });
    }

    const orderUpdate = await this.paymentOrderRepository.update(order);
    console.log("[ConfirmPayment] PaymentOrder updated", orderUpdate);
    if (!orderUpdate.isSuccess) return Result.fail(orderUpdate.getError());
    const paymentUpdate = await this.paymentRepository.update(payment);
    console.log("[ConfirmPayment] Payment updated", paymentUpdate);
    if (!paymentUpdate.isSuccess) return Result.fail(paymentUpdate.getError());

    await this.eventBus.publish(
      PaymentTransactionResult.create({
        aggregateId: payment.getId().getValue(),
        version: payment.getVersion(),
        paymentId: payment.getId().getValue(),
        success: input.success,
      })
    );
    console.log("[ConfirmPayment] PaymentTransactionResult published");
    if (orderTerminalEvent) {
      await this.eventBus.publish(orderTerminalEvent);
      console.log("[ConfirmPayment] OrderTerminalEvent published");
    }
    return Result.ok(undefined);
  }
}
