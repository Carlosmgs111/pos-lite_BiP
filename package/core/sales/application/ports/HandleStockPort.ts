import type { Result } from "../../../shared/domain/Result";

export interface HandleStockPort {
  reserveStock(itemId: string, quantity: number): Promise<Result<Error, void>>;
  releaseStock(
    itemId: string,
    stockToRelease: number
  ): Promise<Result<Error, void>>;
  commitStock(itemId: string, quantity: number): Promise<Result<Error, void>>;
}
