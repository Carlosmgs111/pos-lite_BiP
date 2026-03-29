import { Product } from "../domain/Product";
import type { ProductRepository } from "../domain/ProductRepository";
import { Result } from "../../shared/domain/Result";
import { ProductNotFoundError } from "../domain/Errors/ProductNotFoundError";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];
  registry(product: Product): Promise<Result<Error, void>> {
    this.products.push(product);
    return Promise.resolve(Result.ok(undefined));
  }
  async getProduct(
    productId: string
  ): Promise<Result<ProductNotFoundError, Product>> {
    const product = this.products.find((product) => product.getId().getValue() === productId);
    if (!product) {
      return Result.fail(new ProductNotFoundError());
    }
    return Result.ok(product);
  }
  listProducts(): Promise<Result<Error, Product[]>> {
    return Promise.resolve(Result.ok(this.products));
  }
  purgeDb() {
    this.products = [];
  }
}
