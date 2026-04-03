import type { GetProductsInfo as GetProductsInfoPort } from "../application/ports/GetProductsInfo";
import { Result } from "../../shared/domain/Result";
import { getProducts } from "../../inventory";

export class GetProductsInfo implements GetProductsInfoPort {
  constructor() {}
  async execute(
    productIds: string[]
  ): Promise<Result<Error, { name: string; price: number }[]>> {
    const productResult = await getProducts.execute(productIds);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const products = productResult.getValue()!;
    return Result.ok(
      products.map((product) => ({
        name: product.getName(),
        price: product.getPrice(),
      }))
    );
  }
}
