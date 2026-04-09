import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { PaymentCommit } from "./application/use-cases/PaymentCommit";
import { PaymentCompletedEventHandler } from "./application/event-handlers/PaymentCompletedEventHandler";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/PaymentMethod";
export { PaymentOrderCompleted } from "./domain/events/PaymentOrderCompleted";
export { PaymentOrderFailed } from "./domain/events/PaymentOrderFailed";
import { SalesReadyToPay } from "../sales";

const eventBus = InMemoryEventBus.create();

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository);
export const paymentCommit = new PaymentCommit(paymentOrderRepository, eventBus);

eventBus.subscribe(
  SalesReadyToPay.eventName,
  new PaymentCompletedEventHandler(createPaymentOrder)
);
