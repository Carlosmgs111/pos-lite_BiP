import type { ProductRepository } from "../../domain/ProductRepository";
import type { Product } from "../../domain/Product";
import { Result } from "../../../shared/domain/Result";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";

// * 🔎 [AUDIT-18-START] MED · type lie en el retorno (Product[] vs Product[] | undefined)
// ! Problem: la firma promete `Promise<Result<Error, Product[]>>` pero la línea 19 hace
// !   `Result.ok(productResult.getValue())` donde getValue() es `Product[] | undefined`
// !   (porque ProductRepository.getProducts puede retornar undefined — ver AUDIT-20).
// !   TypeScript no detecta el unsafe cast porque Result.ok es genérico permisivo. El consumer
// !   tipado como Product[] puede recibir undefined y reventar con "cannot read properties".
// ? Solution: añadir el non-null assertion explícito `Result.ok(productResult.getValue()!)` o,
// ?   mejor, arreglar AUDIT-20 (repo devuelve [] en vez de undefined) y propagar el cambio.
export class GetProducts {
  constructor(private productRepository: ProductRepository) {}
  async execute(productIds: string[]): Promise<Result<Error, Product[]>> {
    if (productIds.length === 0) {
      return Result.ok([]);
    }
    const productResult = await this.productRepository.getProducts(productIds);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    if (!productResult.getValue().length) {
      return Result.fail(new ProductNotFoundError());
    }
    return Result.ok(productResult.getValue());
  }
}
// 🔎 [AUDIT-18-END]
