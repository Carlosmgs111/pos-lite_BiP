import {Result} from "../../../shared/domain/Result";
import { GetProduct } from "./GetProduct";

export class ReserveStock {
  constructor(private getProduct: GetProduct) {}
  async execute(productId: string, quantity: number): Promise<Result<Error, boolean>> {
    const productResult = await this.getProduct.execute(productId);
    if (!productResult.isSuccess) {
      return Result.fail(productResult.getError());
    }
    const product = productResult.getValue()!;
    const reservedResult = await product.reserveStock(quantity);
    if (!reservedResult.isSuccess) {
      return Result.fail(reservedResult.getError());
    }
    return Result.ok(true);
  }
}