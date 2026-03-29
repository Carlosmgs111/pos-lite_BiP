import type { ProductRepository } from "../../domain/ProductRepository";
import type { Product } from "../../domain/Product";
import { Result } from "../../../shared/domain/Result";

export class GetProduct {
  constructor(private productRepository: ProductRepository) {}
  async execute(
    productId: string
  ): Promise<Result<Error, Product>> {
    const productResult = await this.productRepository.getProduct(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    return Result.ok(productResult.getValue());
  }
}
