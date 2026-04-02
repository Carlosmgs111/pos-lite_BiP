import { Result } from "../../../shared/domain/Result";
import type { GetProduct } from "./GetProduct";
import type { ProductRepository } from "../../domain/ProductRepository";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";

export class HandleStockForSale {
  constructor(
    private getProduct: GetProduct,
    private productRepository: ProductRepository
  ) {}

  async reserveStock(
    productId: string,
    quantity: number
  ): Promise<Result<ProductNotFoundError, void>> {
    const productResult = await this.getProduct.execute(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const reservedResult = await product.reserveStock(quantity);
    if (!reservedResult.isSuccess) {
      return Result.fail(reservedResult.getError());
    }
    return this.productRepository.update(productId, product);
  }

  async releaseStock(
    productId: string,
    stockToRelease: number
  ): Promise<Result<ProductNotFoundError, void>> {
    const productResult = await this.productRepository.getProduct(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    if (!productResult.getValue()) {
      return Result.fail(new ProductNotFoundError());
    }
    const product = productResult.getValue()!;
    const updatedProduct = product.releaseStock(stockToRelease);
    return this.productRepository.update(productId, updatedProduct.getValue()!);
  }

  async commitStock(
    productId: string,
    quantity: number
  ): Promise<Result<ProductNotFoundError, void>> {
    const productResult = await this.productRepository.getProduct(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const updatedProduct = product.confirmStock(quantity);
    return this.productRepository.update(productId, updatedProduct.getValue()!);
  }
}
