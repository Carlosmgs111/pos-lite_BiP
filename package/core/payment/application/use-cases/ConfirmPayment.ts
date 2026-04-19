import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";
import { PaymentOrderStatus } from "../../domain/PaymentOrderStatus";
import { PaymentOrderCompleted } from "../../domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../../domain/events/PaymentOrderFailed";
import type { EventBus } from "../../../shared/domain/bus/EventBus";
import { PaymentTransactionResult } from "../../domain/events/PaymentTransactionResult";

const MAX_FAILED_PAYMENTS = 3;

export class ConfirmPayment {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private eventBus: EventBus
  ) {}
  async execute(
    paymentId: string,
    success: boolean
  ): Promise<Result<Error, void>> {
    const orderResult =
      await this.paymentOrderRepository.findByPaymentId(paymentId);
    console.log("[ConfirmPayment] Payment order found", {
      orderResult,
    });
    if (!orderResult.isSuccess) {
      console.log("[ConfirmPayment] Payment order not found", {
        paymentId,
      });
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      console.log("[ConfirmPayment] Payment order not found", {
        paymentId,
      });
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = orderResult.getValue()!;
    console.log("[ConfirmPayment] Payment order found", {
      paymentOrder,
    });
    const registerResult = paymentOrder.registerPayment(paymentId, success);
    if (!registerResult.isSuccess) {
      console.log("[ConfirmPayment] Payment registration failed", registerResult.getError());
      return Result.fail(registerResult.getError());
    }

    this.eventBus.publish(
      new PaymentTransactionResult({
        paymentId,
        success,
      })
    );

    console.log(paymentOrder.getStatus());

    if (paymentOrder.getStatus() === PaymentOrderStatus.COMPLETED) {
      await this.paymentOrderRepository.update(paymentOrder);
      console.log("[ConfirmPayment] Payment order completed, publishing event");
      await this.eventBus.publish(
        new PaymentOrderCompleted({
          saleId: paymentOrder.getSaleId().getValue(),
        })
      );
      return Result.ok(undefined);
    }
    console.log("[ConfirmPayment] Payment order not completed");
    if (
      !success &&
      paymentOrder.getFailedPaymentCount() >= MAX_FAILED_PAYMENTS
    ) {
      const failResult = paymentOrder.markAsFailed();
      if (!failResult.isSuccess) {
        return Result.fail(failResult.getError());
      }
      await this.paymentOrderRepository.update(paymentOrder);
      console.log("[ConfirmPayment] Payment order failed, publishing event");
      await this.eventBus.publish(
        new PaymentOrderFailed({ saleId: paymentOrder.getSaleId().getValue() })
      );
      return Result.ok(undefined);
    }

    await this.paymentOrderRepository.update(paymentOrder);
    return Result.ok(undefined);
  }
}
