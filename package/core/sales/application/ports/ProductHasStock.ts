import { Result } from "../../../shared/domain/Result";

export interface ProductHasStock {
    execute(productName: string, quantity: number): Promise<Result<Error, boolean>>;
}