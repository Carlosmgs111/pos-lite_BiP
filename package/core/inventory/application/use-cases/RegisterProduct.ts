import { Product } from "../../domain/Product";
import type { ProductRepository } from "../../domain/ProductRepository";
import { Result } from "../../../shared/domain/Result";

type RegisterProductProps = {
  id: string;
  name: string;
  price: number;
  stock: number;
  reservedStock: number;
};

// * 🔎 [AUDIT-17-START] HIGH · RegisterProduct no chequea duplicados por id
// ! Problem: invoca `productRepository.registry(product)` directo, y InMemoryProductRepository
// !   solo hace push (no UNIQUE constraint). Registrar dos veces el mismo id crea duplicados;
// !   getProducts devolverá los dos en filter, y `[0]` en HandleStockForSale.getProductOrFail
// !   trabaja sobre una copia indeterminista. En producción con DB real probablemente revienta
// !   con UNIQUE violation, pero el use case devolverá el error sin contexto útil.
// ? Solution: chequear existencia antes de registrar:
// ?   const existing = await this.productRepository.getProducts([productProps.id]);
// ?   if (existing.isSuccess && existing.getValue()?.length) return Result.fail(new Error("Product already exists"));
// ?   También considerar añadir un método `findById` al puerto (más eficiente que filter).
export class RegisterProduct {
  constructor(private productRepository: ProductRepository) {}
  async execute(
    productProps: RegisterProductProps
  ): Promise<Result<Error, void>> {
    const existing = await this.productRepository.getProducts([
      productProps.id,
    ]);
    if (!existing.isSuccess) {
      return Result.fail(existing.getError());
    }
    if (existing.getValue().length) {
      return Result.fail(new Error("Product already exists"));
    }
    const product = Product.create(productProps);
    return this.productRepository.registry(product);
  }
}
// 🔎 [AUDIT-17-END]
