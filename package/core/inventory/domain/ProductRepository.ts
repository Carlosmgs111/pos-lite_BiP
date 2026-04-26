import { Result } from "../../shared/domain/Result";
import type { Product } from "./Product";

export interface ProductRepository {
  registry(product: Product): Promise<Result<Error, void>>;
  getProducts(productIds: string[]): Promise<Result<Error, Product[]>>;
  listProducts(): Promise<Result<Error, Product[]>>;
  update(product: Product): Promise<Result<Error, void>>;
}
