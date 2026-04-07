import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { GetProductsInfo } from "./infrastructure/GetProductsInfo";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";
import { GetSale } from "./application/use-cases/GetSale";
import { CancelSale } from "./application/use-cases/CancelSale";
import { HandleStock } from "./infrastructure/HandleStock";
import { InMemoryEventBus } from "../shared/infrastructure/InMemoryEventBus";

const eventBus = InMemoryEventBus.create();

export { SalesConfirmed } from "./domain/events/SalesConfirmed";

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
