import { Result } from "../../../shared/domain/Result";

export interface HandleStockForSalePort {
  reserveStock(itemId: string, quantity: number): Promise<Result<Error, void>>;
  releaseStock(
    itemId: string,
    stockToRelease: number
  ): Promise<Result<Error, void>>;
  commitStock(itemId: string, quantity: number): Promise<Result<Error, void>>;
  restoreStock(itemId: string, quantity: number): Promise<Result<Error, void>>;
  revertCommitStock(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>>;
}
