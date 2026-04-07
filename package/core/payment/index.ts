import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { InMemoryPaymentOrderRepository } from "./infrastructure/InMemoryPaymentOrderRepository";
import { CreatePaymentOrder } from "./application/use-cases/CreatePaymentOrder";
import { PaymentCompletedEventHandler } from "./application/event-handlers/PaymentCompletedEventHandler";
import { SalesConfirmed } from "../sales";

export const paymentOrderRepository = new InMemoryPaymentOrderRepository();
const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);

const eventBus = InMemoryEventBus.create();
eventBus.subscribe(
  "SalesConfirmed",
  new PaymentCompletedEventHandler(createPaymentOrder)
);
