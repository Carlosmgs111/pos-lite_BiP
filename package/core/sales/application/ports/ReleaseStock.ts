import type { Result } from "../../../shared/domain/Result";

export interface ReleaseStock {
  execute(itemId: string, quantity: number): Promise<Result<Error, void>>;
}
