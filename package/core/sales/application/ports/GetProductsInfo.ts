import { Result } from "../../../shared/domain/Result";

export interface GetProductsInfo {
  execute(productIds: string[]): Promise<Result<Error, { name: string; price: number }[]>>;
}
