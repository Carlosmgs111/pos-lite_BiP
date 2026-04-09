import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrderStatus";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

export class PaymentCommit {
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
    await this.paymentRepository.update(paymentOrder);
    if (paymentOrder.getStatus() === PaymentOrderStatus.COMPLETED) {
      await this.eventBus.publish(
        new PaymentOrderCompleted(paymentOrder.getSaleId().getValue())
      );
    }
    return Result.ok(undefined);
  }
}
