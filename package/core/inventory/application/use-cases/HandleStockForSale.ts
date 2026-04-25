import { Result } from "../../../shared/domain/Result";
import type { ProductRepository } from "../../domain/ProductRepository";
import type { Product } from "../../domain/Product";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";
import type { HandleStockForSalesPort } from "../ports/HandleStockForSales";

export class HandleStockForSale implements HandleStockForSalesPort {
  constructor(
    private productRepository: ProductRepository,
  ) {}

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
    return this.productRepository.update(productId, product);
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
    return this.productRepository.update(productId, product);
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
    return this.productRepository.update(productId, product);
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
    return this.productRepository.update(productId, product);
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
    return this.productRepository.update(productId, product);
  }
}
