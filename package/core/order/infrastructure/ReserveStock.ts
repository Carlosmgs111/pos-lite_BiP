import type { ReserveStock as _ReserveStock } from "../application/ports/ReserveStock";
import { reserveStock } from "../../inventory";


export class ReserveStock implements _ReserveStock {
    constructor() {}
    execute(productName: string, quantity: number): Promise<boolean> {
        return reserveStock.execute(productName, quantity);
    }
}
