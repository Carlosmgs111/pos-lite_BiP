import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { PaymentCompletedEventHandler } from "./application/event-handlers/PaymentCompletedEventHandler";
import { AddPayment } from "./application/use-cases/AddPayment";
export { PaymentMethod } from "./domain/PaymentMethod";

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
 const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);
export const addPayment = new AddPayment(paymentOrderRepository);

const eventBus = InMemoryEventBus.create();
eventBus.subscribe(
  "SalesConfirmed",
  new PaymentCompletedEventHandler(createPaymentOrder)
);
