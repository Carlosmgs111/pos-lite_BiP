import type { Result } from "../../../shared/domain/Result";

export interface ConfirmStock {
    execute(itemId: string, quantity: number): Promise<Result<Error, void>>;
}   