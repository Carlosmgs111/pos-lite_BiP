import type {
  PaymentGateway,
  PaymentRequest,
} from "../../domain/PaymentGateway";
import type { PaymentRepository } from "../../domain/PaymentRepository";
import { PaymentType } from "../../domain/Payment";
import { Result } from "../../../shared/domain/Result";
import { InvalidPaymentError } from "../../domain/Errors/InvalidPaymentError";

// 🛠️ FASE 14: ProcessPayment — Idempotencia y validación de tipo
// ! [ANTES] ProcessPayment no verificaba el tipo de Payment ni era idempotente
// ? [DESPUÉS] Valida que sea CHARGE y retorna externalId existente si ya fue procesado

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
      // 1. Cargar Payment
      const paymentResult = await this.paymentRepository.findById(paymentId);
      if (!paymentResult.isSuccess) {
        return Result.fail(paymentResult.getError());
      }
      const payment = paymentResult.getValue();
      if (!payment) {
        return Result.fail(new Error("Payment not found"));
      }

      // 2. Validar que es un CHARGE
      if (payment.getType() !== PaymentType.CHARGE) {
        return Result.fail(
          new InvalidPaymentError(
            "Cannot process a refund payment through gateway"
          )
        );
      }
      // 3. Idempotencia: si ya tiene externalId, retornarlo
      if (payment.getExternalId()) {
        return Result.ok(payment.getExternalId()!);
      }

      // 4. Llamar al gateway
      const transactionIdResult = await this.gateway.requestPayment(request);
      if (!transactionIdResult.isSuccess) {
        return Result.fail(transactionIdResult.getError());
      }
      const transactionId = transactionIdResult.getValue();

      // 5. Vincular transaction ID al Payment
      const processResult = payment.processing(transactionId);
      if (!processResult.isSuccess) {
        return Result.fail(processResult.getError()!);
      }
      await this.paymentRepository.update(payment);

      return Result.ok(transactionId);
    } catch (err) {
      console.error(err);
      return Result.fail(err as Error);
    }
  }
}
