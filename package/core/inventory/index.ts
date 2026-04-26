import { InMemoryProductRepository } from "./infrastructure/InMemoryProductRepository";
import { GetProducts } from "./application/use-cases/GetProducts";
import { RegisterProduct } from "./application/use-cases/RegisterProduct";
import { HandleStockForSale } from "./application/use-cases/HandleStockForSale";
export { type HandleStockForSalePort } from "./application/ports/HandleStockForSale";

export const productRepository = new InMemoryProductRepository();
export const getProducts = new GetProducts(productRepository);
export const registerProduct = new RegisterProduct(productRepository);
export const handleStockForSale = new HandleStockForSale(productRepository);
