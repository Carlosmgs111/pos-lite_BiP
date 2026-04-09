import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { GetProductsInfo } from "./infrastructure/GetProductsInfo";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";
import { GetSale } from "./application/use-cases/GetSale";
import { CancelSale } from "./application/use-cases/CancelSale";
import { CompleteSale } from "./application/use-cases/CompleteSale";
import { FailSale } from "./application/use-cases/FailSale";
import { SaleCompletedOnPayment } from "./application/event-handlers/SaleCompletedOnPayment";
import { SaleFailedOnPayment } from "./application/event-handlers/SaleFailedOnPayment";
import { HandleStock } from "./infrastructure/HandleStock";
import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";
import { PaymentOrderCompleted } from "../payment/domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../payment/domain/events/PaymentOrderFailed";

const eventBus = InMemoryEventBus.create();

export { SalesReadyToPay } from "./domain/events/SalesReadyToPay";

export const saleRepository = new InMemorySaleRepository();
export const getProductsInfo = new GetProductsInfo();
export const getSale = new GetSale(saleRepository);
const handleStockForSale = new HandleStock();

export const cancelSale = new CancelSale(saleRepository, handleStockForSale);

export const addItemToSale = new AddItemToSale(
  handleStockForSale,
  saleRepository,
  getProductsInfo
);
export const removeItemFromSale = new RemoveItemFromSale(
  saleRepository,
  handleStockForSale
);
export const registerSale = new RegisterSale(
  saleRepository,
  handleStockForSale,
  eventBus
);
export const createSale = new CreateSale(saleRepository, getProductsInfo);
const completeSale = new CompleteSale(saleRepository);
const failSale = new FailSale(saleRepository, handleStockForSale);

eventBus.subscribe(
  PaymentOrderCompleted.eventName,
  new SaleCompletedOnPayment(completeSale)
);
eventBus.subscribe(
  PaymentOrderFailed.eventName,
  new SaleFailedOnPayment(failSale)
);
