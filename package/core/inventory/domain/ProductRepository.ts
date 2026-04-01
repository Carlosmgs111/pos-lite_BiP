import { Result } from "../../shared/domain/Result";
import type { Product } from "./Product";

export interface ProductRepository {
  registry(product: Product): Promise<Result<Error, void>>;
  getProduct(productName: string): Promise<Result<Error, Product | undefined>>;
  listProducts(): Promise<Result<Error, Product[] | undefined>>;
  update(productId: string, props: Partial<Product>): Promise<Result<Error, void>>;
}
