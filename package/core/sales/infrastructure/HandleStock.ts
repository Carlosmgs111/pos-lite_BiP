import type { HandleStockPort } from "../application/ports/HandleStockPort";
import type { Result } from "../../shared/domain/Result";
import type { HandleStockForSalesPort } from "../../inventory";

export class HandleStock implements HandleStockPort {
  constructor(private handleStockForSale: HandleStockForSalesPort) {}

  async reserveStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await this.handleStockForSale.reserveStock(itemId, quantity);
  }
  async releaseStock(
    itemId: string,
    stockToRelease: number
  ): Promise<Result<Error, void>> {
    return await this.handleStockForSale.releaseStock(itemId, stockToRelease);
  }
  async commitStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await this.handleStockForSale.commitStock(itemId, quantity);
  }
  async restoreStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await this.handleStockForSale.restoreStock(itemId, quantity);
  }
  async revertCommitStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await this.handleStockForSale.revertCommitStock(itemId, quantity);
  }
}
