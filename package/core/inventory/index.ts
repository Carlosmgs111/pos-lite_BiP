import { InMemoryProductRepository } from "./infrastructure/InMemoryProductRepository";
import { GetProduct } from "./application/use-cases/GetProduct";
import { RegisterProduct } from "./application/use-cases/RegisterProduct";
import { ReserveStock } from "./application/use-cases/ReserveStock";

export const productRepository = new InMemoryProductRepository();
export const getProduct = new GetProduct(productRepository);
export const registerProduct = new RegisterProduct(productRepository);
export const reserveStock = new ReserveStock(getProduct);

