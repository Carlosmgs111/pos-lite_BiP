import type {
  PaymentGateway,
  PaymentRequest,
} from "../../domain/PaymentGateway";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { Result } from "../../../shared/domain/Result";

export class ProcessPayment {
  constructor(
    private paymentRepository: PaymentRepository,
    private gateway: PaymentGateway
  ) {}

  async execute(
    paymentId: string,
    request: PaymentRequest
  ): Promise<Result<Error, string>> {
    try {
      const transactionId = await this.gateway.requestPayment(request);

      // Load Payment and link to external transaction
      const paymentResult = await this.paymentRepository.findById(paymentId);
      if (!paymentResult.isSuccess || !paymentResult.getValue()) {
        return Result.fail(new Error("Payment not found"));
      }
      const payment = paymentResult.getValue()!;

      const processResult = payment.processing(transactionId);
      if (!processResult.isSuccess) {
        return Result.fail(processResult.getError()!);
      }
      await this.paymentRepository.update(payment);

      return Result.ok(transactionId);
    } catch (err) {
      return Result.fail(err as Error);
    }
  }
}
