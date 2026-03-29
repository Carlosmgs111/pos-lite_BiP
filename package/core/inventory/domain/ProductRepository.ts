import { Result } from "../../shared/domain/Result";
import { ProductNotFoundError } from "./Errors/ProductNotFoundError";
import type { Product } from "./Product";

export interface ProductRepository {
  registry(product: Product): Promise<Result<Error, void>>;
  getProduct(productName: string): Promise<Result<ProductNotFoundError, Product>>;
  listProducts(): Promise<Result<Error, Product[]>>;
}
