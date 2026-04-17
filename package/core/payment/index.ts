import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { HttpPaymentGateway } from "./infrastructure/HttpPaymentGateway";
import { WebhookHandler } from "./infrastructure/WebhookHandler";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { CancelPaymentOrder } from "./application/use-cases/CancelPaymentOrder";
import { ConfirmPayment } from "./application/use-cases/ConfirmPayment";
import { ProcessPayment } from "./application/use-cases/ProcessPayment";
import { ReconcilePayment } from "./application/use-cases/ReconcilePayment";
import { CreatePaymentOrderOnSaleReady } from "./application/event-handlers/CreatePaymentOrderOnSaleReady";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/PaymentMethod";
export { PaymentOrderCompleted } from "./domain/events/PaymentOrderCompleted";
export { PaymentOrderFailed } from "./domain/events/PaymentOrderFailed";
export { PaymentGatewayUnreachableError } from "./infrastructure/Errors/PaymentGatewayError";
export { GatewayTransactionStatus } from "./domain/PaymentGateway";
import { SalesReadyToPay } from "../sales";

const GATEWAY_URL = "http://localhost:3000";

const eventBus = InMemoryEventBus.create();

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository);
export const confirmPayment = new ConfirmPayment(paymentOrderRepository, eventBus);
export const cancelPaymentOrder = new CancelPaymentOrder(paymentOrderRepository);

const paymentGateway = new HttpPaymentGateway(GATEWAY_URL);
export const processPayment = new ProcessPayment(paymentOrderRepository, paymentGateway);
export const reconcilePayment = new ReconcilePayment(paymentGateway, confirmPayment);
export const webhookHandler = new WebhookHandler(confirmPayment);
eventBus.subscribe(
  SalesReadyToPay.eventName,
  new CreatePaymentOrderOnSaleReady(createPaymentOrder)
);
