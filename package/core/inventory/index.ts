import { InMemoryProductRepository } from "./infrastructure/InMemoryProductRepository";
import { GetProduct } from "./application/use-cases/GetProduct";
import { RegisterProduct } from "./application/use-cases/RegisterProduct";
import { HandleStockForSale } from "./application/use-cases/HandleStockForSale";

export const productRepository = new InMemoryProductRepository();
export const getProduct = new GetProduct(productRepository);
export const registerProduct = new RegisterProduct(productRepository);
export const handleStockForSale = new HandleStockForSale(getProduct, productRepository);
