import { InMemoryProductRepository } from "./infrastructure/InMemoryProductRepository";
import { GetProduct } from "./application/use-cases/GetProduct";
import { RegisterProduct } from "./application/use-cases/RegisterProduct";
import { ReserveStock } from "./application/use-cases/ReserveStock";
import { ReleaseProduct } from "./application/use-cases/ReleaseProduct";

export const productRepository = new InMemoryProductRepository();
export const getProduct = new GetProduct(productRepository);
export const registerProduct = new RegisterProduct(productRepository);
export const reserveStock = new ReserveStock(getProduct);
export const releaseProduct = new ReleaseProduct(productRepository);

