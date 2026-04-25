import type { HandleStockPort } from "../application/ports/HandleStockPort";
import type { Result } from "../../shared/domain/Result";
import { handleStockForSale } from "../../inventory";

export class HandleStock implements HandleStockPort {
  constructor() {}

  async reserveStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await handleStockForSale.reserveStock(itemId, quantity);
  }
  async releaseStock(
    itemId: string,
    stockToRelease: number
  ): Promise<Result<Error, void>> {
    return await handleStockForSale.releaseStock(itemId, stockToRelease);
  }
  async commitStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await handleStockForSale.commitStock(itemId, quantity);
  }
  async restoreStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await handleStockForSale.restoreStock(itemId, quantity);
  }
  async revertCommitStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await handleStockForSale.revertCommitStock(itemId, quantity);
  }
}
