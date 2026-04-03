import { Product } from "../domain/Product";
import type { ProductRepository } from "../domain/ProductRepository";
import { Result } from "../../shared/domain/Result";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];
  async registry(product: Product): Promise<Result<Error, void>> {
    this.products.push(product);
    return Result.ok(undefined);
  }
  async getProducts(productIds: string[]): Promise<Result<Error, Product[] | undefined>> {
    const products = this.products.filter(
      (product) => productIds.includes(product.getId().getValue())
    );
    if (products.length === 0) {
      return Result.ok(undefined);
    }
    return Result.ok(products);
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
