import type { ProductRepository } from "../../domain/ProductRepository";
import { Result } from "../../../shared/domain/Result";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";

export class ReleaseProduct {
  constructor(private productRepository: ProductRepository) {}
  async execute(
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
}
