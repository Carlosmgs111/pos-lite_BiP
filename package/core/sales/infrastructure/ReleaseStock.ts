import type { ReleaseStock as ReleaseStockPort } from "../application/ports/ReleaseStock";
import { Result } from "../../shared/domain/Result";
import { releaseStock } from "../../inventory";

export class ReleaseStock implements ReleaseStockPort {
  constructor() {}

  async execute(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return releaseStock.execute(itemId, quantity);
  }
}
