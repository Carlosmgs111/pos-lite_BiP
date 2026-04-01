import { Result } from "../../shared/domain/Result";
import { Sale } from "./Sale";

export class SaleNotFoundError extends Error {
  constructor() {
    super("Sale not found");
  }
}

export interface SaleRepository {
  registry(sale: Sale): Promise<Result<SaleNotFoundError, void>>;
  getSaleById(id: string): Promise<Result<SaleNotFoundError, Sale>>;
  update(sale: Sale): Promise<Result<SaleNotFoundError, void>>;
}
