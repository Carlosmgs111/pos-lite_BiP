import type { ReserveStock as ReserveStockPort } from "../application/ports/ReserveStock";
import type { Result } from "../../shared/domain/Result";
import { reserveStock } from "../../inventory";

export class ReserveStock implements ReserveStockPort {
    constructor() {}
    execute(productId: string, quantity: number): Promise<Result<Error, boolean>> {
        return reserveStock.execute(productId, quantity);
    }
}
