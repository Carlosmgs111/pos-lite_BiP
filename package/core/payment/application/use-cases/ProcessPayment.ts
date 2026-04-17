import type {
  PaymentGateway,
  PaymentRequest,
} from "../../domain/PaymentGateway";
import { Result } from "../../../shared/domain/Result";
import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";

export class ProcessPayment {
  constructor(
    private paymentOrderRepository: PaymentOrderRepository,
    private gateway: PaymentGateway,
  ) {}

  async execute(paymentId: string, request: PaymentRequest): Promise<Result<Error, string>> {
    try {
      const transactionId = await this.gateway.requestPayment(request);

      const paymentOrderResult = await this.paymentOrderRepository.findByPaymentId(paymentId);
      if (!paymentOrderResult.isSuccess) {
        return Result.fail(paymentOrderResult.getError()!);
      }
      const paymentOrder = paymentOrderResult.getValue()!;
      
      const processPaymentResult = paymentOrder.processPayment(paymentId, transactionId);
      if (!processPaymentResult.isSuccess) {
        return Result.fail(processPaymentResult.getError()!);
      }
      await this.paymentOrderRepository.update(paymentOrder);

      return Result.ok(transactionId);
    } catch (err) {
      return Result.fail(err as Error);
    }
  }
}
