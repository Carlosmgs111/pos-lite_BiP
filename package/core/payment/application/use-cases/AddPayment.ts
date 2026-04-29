import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { Payment, PaymentMethod } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";

export class AddPayment {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private paymentRepository: PaymentRepository
  ) {}

  async execute(input: {
    saleId: string;
    paymentId: string;
    method: PaymentMethod;
    amount: number;
  }): Promise<Result<Error, string>> {
    const orderResult = await this.paymentOrderRepository.findBySaleId(
      input.saleId
    );
    console.log("[AddPayment] PaymentOrder found", orderResult);
    if (!orderResult.isSuccess) return Result.fail(orderResult.getError());
    const order = orderResult.getValue();
    if (!order) {
      return Result.fail(new PaymentOrderNotFoundError());
    }

    const assertResult = order.assertCanAcceptPayment(
      input.amount,
      input.method
    );
    if (!assertResult.isSuccess) return Result.fail(assertResult.getError());

    const registerPendingPaymentResult = order.registerPendingPayment(
      input.amount
    );
    if (!registerPendingPaymentResult.isSuccess) {
      return Result.fail(registerPendingPaymentResult.getError());
    }
    const updateOrderResult = await this.paymentOrderRepository.update(order);
    if (!updateOrderResult.isSuccess) {
      return Result.fail(updateOrderResult.getError());
    }
    const payment = Payment.create({
      id: input.paymentId,
      paymentOrderId: order.getId().getValue(),
      method: input.method,
      amount: input.amount,
    });
    const savePaymentResult = await this.paymentRepository.save(payment);
    if (!savePaymentResult.isSuccess) {
      return Result.fail(savePaymentResult.getError());
    }
    return Result.ok(payment.getId().getValue());
  }
}
