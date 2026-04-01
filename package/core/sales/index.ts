import { InMemorySaleRepository } from "./infrastructure/InMemorySaleRepository";
import { ReserveStock } from "./infrastructure/ReserveStock";
import { GetProductInfo } from "./infrastructure/GetProductInfo";
import { ReleaseStock } from "./infrastructure/ReleaseStock";
import { AddItemToSale } from "./application/use-cases/AddItemToSale";
import { RemoveItemFromSale } from "./application/use-cases/RemoveItemFromSale";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { CreateSale } from "./application/use-cases/CreateSale";
import { GetSale } from "./application/use-cases/GetSale";
import { CancelSale } from "./application/use-cases/CancelSale";
import { ConfirmStock } from "./infrastructure/ConfirmStock";

export const saleRepository = new InMemorySaleRepository();
export const reserveStockCapability = new ReserveStock();
export const getProductInfo = new GetProductInfo();
export const getSale = new GetSale(saleRepository);

export const releaseStock = new ReleaseStock();
export const cancelSale = new CancelSale(saleRepository, releaseStock);

export const addItemToSale = new AddItemToSale(
  reserveStockCapability,
  saleRepository,
  getProductInfo
);
export const confirmStock = new ConfirmStock();
export const removeItemFromSale = new RemoveItemFromSale(saleRepository);
export const registerSale = new RegisterSale(saleRepository, confirmStock);
export const createSale = new CreateSale(saleRepository);

export const createSalesContext = ({}) => {};
