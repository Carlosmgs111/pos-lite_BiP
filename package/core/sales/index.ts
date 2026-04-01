import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { ReserveStock } from "./infrastructure/ReserveStock";
import { GetProductInfo } from "./infrastructure/GetProductInfo";
import { ReleaseStock } from "./infrastructure/ReleaseStock";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";

export const saleRepository = new InMemorySaleRepository();
export const reserveStockCapability = new ReserveStock();
export const getProductInfo = new GetProductInfo();

export const releaseStock = new ReleaseStock();

export const addItemToSale = new AddItemToSale(
  reserveStockCapability,
  saleRepository,
  getProductInfo
);
export const removeItemFromSale = new RemoveItemFromSale(saleRepository);
export const registerSale = new RegisterSale(saleRepository, releaseStock);
export const createSale = new CreateSale(saleRepository);

export const createSalesContext = ({}) => {};
