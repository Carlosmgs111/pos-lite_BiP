import type { ProductRepository } from "../../domain/ProductRepository";
import { Result } from "../../../shared/domain/Result";
import { ProductNotFoundError } from "../../domain/Errors/ProductNotFoundError";

export class ConfirmStock {
  constructor(private productRepository: ProductRepository) {}
  async execute(
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
