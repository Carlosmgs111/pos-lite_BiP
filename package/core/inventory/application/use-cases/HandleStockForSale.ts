import { Result } from "../../../shared/domain/Result";
import type { ProductRepository } from "../../domain/ProductRepository";
import type { Product } from "../../domain/Product";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";
import type { HandleStockForSalePort } from "../ports/HandleStockForSale";

// * 🔎 [AUDIT-26-START] MED · todas las operaciones son read-modify-write sin lock
// ! Problem: cada método (reserve/release/commit/restore/revertCommit) hace
// !   getProductOrFail → mutación en memoria → repository.update. Dos requests concurrentes
// !   sobre el mismo productId leen el mismo estado, mutan independiente, y el último escribe
// !   gana — pérdida de actualización (lost update). En InMemory los repos guardan por
// !   referencia así que no se manifiesta, pero migrar a SQL/Redis sin atomicidad real (no
// !   hay version check en ProductRepository, a diferencia de Payment*) producirá stock negativo
// !   o sobre-venta silenciosa.
// ? Solution: añadir `version` a Product + check optimista en ProductRepository.update
// ?   (espejo de InMemoryPayment*Repository), o operaciones atómicas en el repo
// ?   (UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1).
//
// * 🔎 [AUDIT-25] LOW · naming inconsistencia commitStock (port/use case) ↔ confirmStock (Product)
// ! Problem: HandleStockForSale.commitStock invoca product.confirmStock. Dos verbos para
// !   la misma operación dificultan grep y razonamiento.
// ? Solution: estandarizar a `commitStock` también en Product (rename del método y guarda).
export class HandleStockForSale implements HandleStockForSalePort {
  constructor(
    private productRepository: ProductRepository,
  ) {}
  // 🔎 [AUDIT-26-END]

  private async getProductOrFail(productId: string): Promise<Result<Error, Product>> {
    const productResult = await this.productRepository.getProducts([productId]);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    if (!productResult.getValue()) {
      return Result.fail(new ProductNotFoundError());
    }
    return Result.ok(productResult.getValue()![0]);
  }

  async reserveStock(
    productId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    const productResult = await this.getProductOrFail(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const reserveResult = product.reserveStock(quantity);
    if (!reserveResult.isSuccess) {
      return Result.fail(reserveResult.getError());
    }
    return this.productRepository.update(product);
  }

  async releaseStock(
    productId: string,
    stockToRelease: number
  ): Promise<Result<Error, void>> {
    const productResult = await this.getProductOrFail(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const releaseResult = product.releaseStock(stockToRelease);
    if (!releaseResult.isSuccess) {
      return Result.fail(releaseResult.getError());
    }
    return this.productRepository.update(product);
  }

  async commitStock(
    productId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    const productResult = await this.getProductOrFail(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const confirmResult = product.confirmStock(quantity);
    if (!confirmResult.isSuccess) {
      return Result.fail(confirmResult.getError());
    }
    return this.productRepository.update(product);
  }

  async restoreStock(
    productId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    const productResult = await this.getProductOrFail(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const restoreResult = product.restoreStock(quantity);
    if (!restoreResult.isSuccess) {
      return Result.fail(restoreResult.getError());
    }
    return this.productRepository.update(product);
  }

  async revertCommitStock(
    productId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    const productResult = await this.getProductOrFail(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const revertResult = product.revertCommit(quantity);
    if (!revertResult.isSuccess) {
      return Result.fail(revertResult.getError());
    }
    return this.productRepository.update(product);
  }
}
