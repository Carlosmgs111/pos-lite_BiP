import type { Result } from "../Result";

export interface EventHandler<T> {
    handle(event: T): Promise<Result<Error, void>>;
}