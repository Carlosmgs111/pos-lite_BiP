import { Result } from "../../shared/domain/Result";
import { Sale } from "./Sale";

export interface SaleRepository {
  save(sale: Sale): Promise<Result<Error, void>>;
  getSaleById(id: string): Promise<Result<Error, Sale | undefined>>;
  update(sale: Sale): Promise<Result<Error, void>>;
  delete(saleId: string): Promise<Result<Error, void>>;
}
