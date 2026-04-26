import { Product } from "../domain/Product";
import type { ProductRepository } from "../domain/ProductRepository";
import { Result } from "../../shared/domain/Result";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[] = [];
  async registry(product: Product): Promise<Result<Error, void>> {
    this.products.push(product);
    return Result.ok(undefined);
  }
  // * 🔎 [AUDIT-20-START] LOW · getProducts retorna undefined cuando no hay matches
  // ! Problem: `Result.ok(undefined)` para conjunto vacío rompe el tipo idiomático "lista vacía".
  // !   Forzaba a callers (GetProducts, HandleStockForSale.getProductOrFail) a chequear
  // !   `!getValue()` además de `!isSuccess` y a fabricar ProductNotFoundError. Mezcla
  // !   "no encontré nada" (resultado válido) con "fallo de infra".
  // ? Solution: devolver `Result.ok([])` para vacío. La decisión "tratar vacío como error" es
  // ?   del use case, no del repo. Cambiar tipo de retorno a `Result<Error, Product[]>`.
  async getProducts(productIds: string[]): Promise<Result<Error, Product[]>> {
    const products = this.products.filter(
      (product) => productIds.includes(product.getId().getValue())
    );
    return Result.ok(products);
  }
  // 🔎 [AUDIT-20-END]
  async listProducts(): Promise<Result<Error, Product[]>> {
    return Result.ok(this.products);
  }
  // * 🔎 [AUDIT-19-START] MED · update con Partial<Product> + Object.assign + reasignación inútil
  // ! Problem: (1) la firma `Partial<Product>` permite a callers pasar fragmentos, pero todos los
  // !   callers reales (HandleStockForSale.*) pasan el Product completo — la firma es un type lie.
  // !   (2) Partial<Product> expone TODOS los campos privados (id, name, price, stock, reservedStock)
  // !   como mutables, rompiendo encapsulación. (3) `Object.assign(product, props)` muta el objeto
  // !   ya encontrado en el array — la línea `this.products[index] = product` que sigue es no-op
  // !   redundante (mismo ref). (4) Sin clonar, no hay snapshot semantics → optimistic locking
  // !   futuro estará condenado al mismo bug que tuvieron Payment/PaymentOrder repos.
  // ? Solution: cambiar firma a `update(product: Product): Promise<Result<Error, void>>`. Buscar
  // ?   por `product.getId()`, reemplazar el slot del array. (Opcional para futuro: clone-on-read
  // ?   en getProducts para que update con version check funcione correctamente.)
  async update(product: Product): Promise<Result<Error, void>> {
    const productId = product.getId().getValue();
    const deltaProduct = this.products.find(
      (product) => product.getId().getValue() === productId
    );

    if (!deltaProduct) {
      return Result.fail(new Error("Product not found"));
    }
    Object.assign(deltaProduct, product);
    this.products[this.products.findIndex((product) => product.getId().getValue() === productId)] = deltaProduct;
    return Result.ok(undefined);
  }
  // 🔎 [AUDIT-19-END]
  purgeDb() {
    this.products = [];
  }
}
