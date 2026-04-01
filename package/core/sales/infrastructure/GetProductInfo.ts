import type { GetProductInfo as GetProductInfoPort } from "../application/ports/GetProductInfo";
import { Result } from "../../shared/domain/Result";
import { getProduct } from "../../inventory";

export class GetProductInfo implements GetProductInfoPort {
  constructor() {}
  async execute(
    productId: string
  ): Promise<Result<Error, { name: string; price: number }>> {
    const productResult = await getProduct.execute(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    return Result.ok({ name: product.getName(), price: product.getPrice() });
  }
}
