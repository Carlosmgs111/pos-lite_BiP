import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { InMemoryPaymentRepository } from "./infrastructure/InMemoryPaymentRepository";
import { HttpPaymentGateway } from "./infrastructure/HttpPaymentGateway";
import { PaymentWebhookHandler } from "./infrastructure/PaymentWebhookHandler";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { CancelPaymentOrder } from "./application/use-cases/CancelPaymentOrder";
import { ConfirmPayment } from "./application/use-cases/ConfirmPayment";
import { ProcessPayment } from "./application/use-cases/ProcessPayment";
import { ReconcilePayment } from "./application/use-cases/ReconcilePayment";
import { CreatePaymentOrderOnSaleReady } from "./application/event-handlers/CreatePaymentOrderOnSaleReady";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/Payment";
import { PaymentOrderCompleted } from "./domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "./domain/events/PaymentOrderFailed";
export { PaymentOrderCompleted, PaymentOrderFailed };
export { PaymentGatewayUnreachableError } from "./infrastructure/Errors/PaymentGatewayError";
export { GatewayTransactionStatus } from "./domain/PaymentGateway";
import { SalesReadyToPay } from "../sales";
import { eventBus } from "../shared/config";

const { GATEWAY_URL } = import.meta.env;

console.log("GATEWAY_URL", GATEWAY_URL);

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
export const paymentRepository = new InMemoryPaymentRepository();

const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository, paymentRepository);
export const confirmPayment = new ConfirmPayment(paymentOrderRepository, paymentRepository, eventBus);
export const cancelPaymentOrder = new CancelPaymentOrder(paymentOrderRepository);

const paymentGateway = new HttpPaymentGateway(GATEWAY_URL);
export const processPayment = new ProcessPayment(paymentRepository, paymentGateway);
export const reconcilePayment = new ReconcilePayment(paymentGateway, confirmPayment);
export const webhookHandler = new PaymentWebhookHandler(confirmPayment);

const unsubscribers: Array<() => void> = [];

unsubscribers.push(
  eventBus.subscribe(
    SalesReadyToPay.eventName,
    new CreatePaymentOrderOnSaleReady(createPaymentOrder)
  )
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribers.forEach((fn) => fn());
  });
}
