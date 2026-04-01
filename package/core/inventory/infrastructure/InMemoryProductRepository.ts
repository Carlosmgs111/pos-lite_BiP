import { Product } from "../domain/Product";
import type { ProductRepository } from "../domain/ProductRepository";
import { Result } from "../../shared/domain/Result";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];
  async registry(product: Product): Promise<Result<Error, void>> {
    this.products.push(product);
    return Result.ok(undefined);
  }
  async getProduct(productId: string): Promise<Result<Error, Product | undefined>> {
    const product = this.products.find(
      (product) => product.getId().getValue() === productId
    );
    if (!product) {
      return Result.ok(undefined);
    }
    return Result.ok(product);
  }
  async listProducts(): Promise<Result<Error, Product[]>> {
    return Result.ok(this.products);
  }
  async update(
    productId: string,
    props: Partial<Product>
  ): Promise<Result<Error, void>> {
    const product = this.products.find(
      (product) => product.getId().getValue() === productId
    );
    return Result.ok(undefined);
  }
  purgeDb() {
    this.products = [];
  }
}
