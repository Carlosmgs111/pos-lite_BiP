import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { InMemoryPaymentRepository } from "./infrastructure/InMemoryPaymentRepository";
import { LibSqlPaymentOrderRepository } from "./infrastructure/LibSqlPaymentOrderRepository";
import { LibSqlPaymentRepository } from "./infrastructure/LibSqlPaymentRepository";
import { HttpPaymentGateway } from "./infrastructure/HttpPaymentGateway";
import { PaymentWebhookHandler } from "./infrastructure/PaymentWebhookHandler";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { CancelPaymentOrder } from "./application/use-cases/CancelPaymentOrder";
import { ConfirmPayment } from "./application/use-cases/ConfirmPayment";
import { ProcessPayment } from "./application/use-cases/ProcessPayment";
import { ReconcilePayment } from "./application/use-cases/ReconcilePayment";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/Payment";
import { PaymentOrderCompleted } from "./domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "./domain/events/PaymentOrderFailed";
export { PaymentOrderCompleted, PaymentOrderFailed };
export { PaymentGatewayUnreachableError } from "./infrastructure/Errors/PaymentGatewayError";
export { GatewayTransactionStatus } from "./domain/PaymentGateway";
import { eventBus } from "../shared/config";

const { GATEWAY_URL } = import.meta.env;

console.log("GATEWAY_URL", GATEWAY_URL);

const useTurso = !!import.meta.env.DATABASE_URL;

const gatewayAuthHeaders: Record<string, string> = {};
if (import.meta.env.GATEWAY_AUTH_HEADER) {
  const [name, ...rest] = import.meta.env.GATEWAY_AUTH_HEADER.split(":");
  const value = rest.join(":");
  if (name && value) gatewayAuthHeaders[name.trim()] = value.trim();
}

export const paymentOrderRepository = useTurso
  ? new LibSqlPaymentOrderRepository()
  : new InMemoryPaymentOrderRepository();

export const paymentRepository = useTurso
  ? new LibSqlPaymentRepository()
  : new InMemoryPaymentRepository();

const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository, paymentRepository);
export const confirmPayment = new ConfirmPayment(paymentOrderRepository, paymentRepository, eventBus);
export const cancelPaymentOrder = new CancelPaymentOrder(paymentOrderRepository);

const paymentGateway = new HttpPaymentGateway(GATEWAY_URL, gatewayAuthHeaders);
export const processPayment = new ProcessPayment(paymentRepository, paymentGateway);
export const reconcilePayment = new ReconcilePayment(paymentGateway, confirmPayment);
export const webhookHandler = new PaymentWebhookHandler(confirmPayment);
