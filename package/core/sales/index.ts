import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { GetProductInfo } from "./infrastructure/GetProductInfo";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";
import { GetSale } from "./application/use-cases/GetSale";
import { CancelSale } from "./application/use-cases/CancelSale";
import { HandleStock } from "./infrastructure/HandleStock";

export const saleRepository = new InMemorySaleRepository();
export const getProductInfo = new GetProductInfo();
export const getSale = new GetSale(saleRepository);
const handleStockForSale = new HandleStock();

export const cancelSale = new CancelSale(saleRepository, handleStockForSale);

export const addItemToSale = new AddItemToSale(
  handleStockForSale,
  saleRepository,
  getProductInfo
);
export const removeItemFromSale = new RemoveItemFromSale(saleRepository);
export const registerSale = new RegisterSale(
  saleRepository,
  handleStockForSale
);
export const createSale = new CreateSale(saleRepository);

export const createSalesContext = ({}) => {};
