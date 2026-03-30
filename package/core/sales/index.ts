import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { ReserveStock } from "./infrastructure/ReserveStock";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { GetProductInfo } from "./infrastructure/GetProductInfo";
import { CreateSale } from "./application/use-cases/CreateSale";

export const saleRepository = new InMemorySaleRepository();
export const reserveStock = new ReserveStock();
export const getProductInfo = new GetProductInfo();
export const addItemToSale = new AddItemToSale(
  reserveStock,
  saleRepository,
  getProductInfo
);
export const removeItemFromSale = new RemoveItemFromSale(saleRepository);
export const registerSale = new RegisterSale(saleRepository);
export const createSale = new CreateSale(saleRepository);
