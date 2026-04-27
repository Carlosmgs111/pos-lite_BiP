import type { ProductRepository } from "../../domain/ProductRepository";
import type { Product } from "../../domain/Product";
import { Result } from "../../../shared/domain/Result";
import { PartialProductsFoundError } from "../../domain/Errors/PartialProductsFoundError";

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
    if (productResult.getValue().length !== productIds.length) {
      return Result.fail(new PartialProductsFoundError());
    }
    return Result.ok(productResult.getValue());
  }
}
