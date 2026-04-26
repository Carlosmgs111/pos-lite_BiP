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
