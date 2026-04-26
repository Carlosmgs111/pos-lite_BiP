import { Product } from "../domain/Product";
import type { ProductRepository } from "../domain/ProductRepository";
import { Result } from "../../shared/domain/Result";
import { ConcurrencyError } from "../../shared/domain/Errors/ConcurrencyError";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];
  // Espejo del patrón de InMemoryPayment*Repository: tracking del último version persistido
  // por entidad en un Map separado (los Product en `products` son el live ref que el caller
  // muta tras getProducts; comparar `version` sobre el mismo objeto siempre coincidiría).
  private persistedVersions = new Map<string, number>();

  async registry(product: Product): Promise<Result<Error, void>> {
    this.products.push(product);
    this.persistedVersions.set(
      product.getId().getValue(),
      product.getVersion()
    );
    return Result.ok(undefined);
  }
  async getProducts(productIds: string[]): Promise<Result<Error, Product[]>> {
    const products = this.products.filter(
      (product) => productIds.includes(product.getId().getValue())
    );
    return Result.ok(products);
  }
  async listProducts(): Promise<Result<Error, Product[]>> {
    return Result.ok(this.products);
  }
  async update(product: Product): Promise<Result<Error, void>> {
    const productId = product.getId().getValue();
    const index = this.products.findIndex(
      (p) => p.getId().getValue() === productId
    );
    if (index === -1) {
      return Result.fail(new Error("Product not found"));
    }
    const persistedVersion = this.persistedVersions.get(productId) ?? 0;
    if (product.getVersion() <= persistedVersion) {
      return Result.fail(new ConcurrencyError("Product"));
    }
    this.products[index] = product;
    this.persistedVersions.set(productId, product.getVersion());
    return Result.ok(undefined);
  }
  purgeDb() {
    this.products = [];
    this.persistedVersions.clear();
  }
}
