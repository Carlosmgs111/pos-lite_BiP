import { Result } from "../../../shared/domain/Result";

export interface GetProductInfo {
  execute(productId: string): Promise<Result<Error, { name: string; price: number }>>;
}
