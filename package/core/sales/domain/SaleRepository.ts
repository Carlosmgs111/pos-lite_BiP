import { Sale } from "./Sale";

export interface SaleRepository {
    registry(sale: Sale): Promise<void>;
    getSale(id: string): Promise<Sale>;
    update(sale: Sale): Promise<void>;
}