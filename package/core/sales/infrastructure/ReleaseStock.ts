import type { ReleaseStock as ReleaseStockPort } from "../application/ports/ReleaseStock";
import { Result } from "../../shared/domain/Result";
import { releaseProduct } from "../../inventory";

export class ReleaseStock implements ReleaseStockPort {
  constructor() {}

  async execute(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return releaseProduct.execute(itemId, quantity);
  }
}
