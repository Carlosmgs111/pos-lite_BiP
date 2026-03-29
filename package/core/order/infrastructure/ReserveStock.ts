import type { ReserveStock as _ReserveStock } from "../application/ports/ReserveStock";
import { reserveStock } from "../../inventory";
import type { Result } from "../../shared/domain/Result";


export class ReserveStock implements _ReserveStock {
    constructor() {}
    execute(productId: string, quantity: number): Promise<Result<Error, boolean>> {
        return reserveStock.execute(productId, quantity);
    }
}
