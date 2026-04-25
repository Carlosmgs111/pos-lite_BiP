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
    // 1. Load PaymentOrder
    const orderResult = await this.paymentOrderRepository.findBySaleId(
      input.saleId
    );
    if (!orderResult.isSuccess) return Result.fail(orderResult.getError());
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const order = orderResult.getValue()!;

    // 2. PaymentOrder decides — using its own accumulated state
    const assertResult = order.assertCanAcceptPayment(
      input.amount,
      input.method
    );
    if (!assertResult.isSuccess) return Result.fail(assertResult.getError());

    // 3. Create Payment in its own repo
    const payment = Payment.create({
      id: input.paymentId,
      paymentOrderId: order.getId().getValue(),
      method: input.method,
      amount: input.amount,
    });
    await this.paymentRepository.save(payment);

    // 4. Update PaymentOrder accumulated state
    order.registerPendingPayment(input.amount);
    await this.paymentOrderRepository.update(order);

    return Result.ok(payment.getId().getValue());
  }
}
