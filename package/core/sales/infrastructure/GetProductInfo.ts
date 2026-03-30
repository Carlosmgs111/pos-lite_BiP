import type { GetProductInfo as _GetProductInfo } from "../application/ports/GetProductInfo";
import { getProduct } from "../../inventory";
import { Result } from "../../shared/domain/Result";

export class GetProductInfo implements _GetProductInfo {
  constructor() {}
  async execute(productId: string): Promise<Result<Error, { name: string; price: number }>> {
    const productResult = await getProduct.execute(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    return Result.ok({ name: product.getName(), price: product.getPrice() });
  }
}
