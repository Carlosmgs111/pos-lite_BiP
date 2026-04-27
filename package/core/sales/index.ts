import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { GetProductsInfo } from "./infrastructure/GetProductsInfo";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";
import { GetSale } from "./application/use-cases/GetSale";
import { CancelSale } from "./application/use-cases/CancelSale";
import { HandleStock } from "./infrastructure/HandleStock";
import { eventBus } from "../shared/config";
import { handleStockForSale } from "../inventory";

export { SalesReadyToPay } from "./domain/events/SalesReadyToPay";

export const saleRepository = new InMemorySaleRepository();
export const getProductsInfo = new GetProductsInfo();
export const getSale = new GetSale(saleRepository);
const handleStock = new HandleStock(handleStockForSale);

export const cancelSale = new CancelSale(saleRepository, handleStock);

export const addItemToSale = new AddItemToSale(
  handleStock,
  saleRepository,
  getProductsInfo
);
export const removeItemFromSale = new RemoveItemFromSale(
  saleRepository,
  handleStock
);
export const registerSale = new RegisterSale(
  saleRepository,
  handleStock,
  eventBus
);
export const createSale = new CreateSale(saleRepository, getProductsInfo);
