import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrderStatus";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../../domain/events/PaymentOrderFailed";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

const MAX_FAILED_PAYMENTS = 3;

export class ConfirmPayment {
  constructor(
    private paymentRepository: PaymentOrderRepository,
    private eventBus: EventBus
  ) {}
  async execute(
    paymentId: string,
    success: boolean
  ): Promise<Result<Error, void>> {
    const orderResult = await this.paymentRepository.findByPaymentId(paymentId);
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = orderResult.getValue()!;
    const registerResult = paymentOrder.registerPayment(paymentId, success);
    if (!registerResult.isSuccess) {
      return Result.fail(registerResult.getError());
    }

    if (paymentOrder.getStatus() === PaymentOrderStatus.COMPLETED) {
      await this.paymentRepository.update(paymentOrder);
      await this.eventBus.publish(
        new PaymentOrderCompleted(paymentOrder.getSaleId().getValue())
      );
      return Result.ok(undefined);
    }

    if (!success && paymentOrder.getFailedPaymentCount() >= MAX_FAILED_PAYMENTS) {
      const failResult = paymentOrder.markAsFailed();
      if (!failResult.isSuccess) {
        return Result.fail(failResult.getError());
      }
      await this.paymentRepository.update(paymentOrder);
      await this.eventBus.publish(
        new PaymentOrderFailed(paymentOrder.getSaleId().getValue())
      );
      return Result.ok(undefined);
    }

    await this.paymentRepository.update(paymentOrder);
    return Result.ok(undefined);
  }
}
