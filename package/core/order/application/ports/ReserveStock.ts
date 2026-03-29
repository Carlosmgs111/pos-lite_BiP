import { Result } from "../../../shared/domain/Result";

export interface ReserveStock {
  execute(productId: string, quantity: number): Promise<Result<Error, boolean>>;
}
