import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { CancelPaymentOrder } from "./application/use-cases/CancelPaymentOrder";
import { ConfirmPayment } from "./application/use-cases/ConfirmPayment";
import { CreatePaymentOrderOnSaleReady } from "./application/event-handlers/CreatePaymentOrderOnSaleReady";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/PaymentMethod";
export { PaymentOrderCompleted } from "./domain/events/PaymentOrderCompleted";
export { PaymentOrderFailed } from "./domain/events/PaymentOrderFailed";
import { SalesReadyToPay } from "../sales";

const eventBus = InMemoryEventBus.create();

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository);
export const confirmPayment = new ConfirmPayment(paymentOrderRepository, eventBus);
export const cancelPaymentOrder = new CancelPaymentOrder(paymentOrderRepository);

eventBus.subscribe(
  SalesReadyToPay.eventName,
  new CreatePaymentOrderOnSaleReady(createPaymentOrder)
);
