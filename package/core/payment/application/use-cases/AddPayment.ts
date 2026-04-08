import type { PaymentRepository } from "../../domain/PaymentRepository";
import type { PaymentProps } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrderStatus";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import type { EventBus } from "../../../shared/domain/bus/EventBus";

export class AddPayment {
  constructor(
    private paymentRepository: PaymentRepository,
    private eventBus: EventBus
  ) {}
  async execute(saleId: string, payment: PaymentProps): Promise<Result<Error, void>> {
    const paymentOrderResult = await this.paymentRepository.findBySaleId(saleId);
    if (!paymentOrderResult.isSuccess) {
      return Result.fail(paymentOrderResult.getError());
    }
    if (!paymentOrderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = paymentOrderResult.getValue()!;
    const addResult = paymentOrder.addPayment(payment);
    if (!addResult.isSuccess) {
      return Result.fail(addResult.getError());
    }
    await this.paymentRepository.update(paymentOrder);
    if (paymentOrder.getStatus() === PaymentOrderStatus.COMPLETED) {
      await this.eventBus.publish(new PaymentOrderCompleted(saleId));
    }
    return Result.ok(undefined);
  }
}
