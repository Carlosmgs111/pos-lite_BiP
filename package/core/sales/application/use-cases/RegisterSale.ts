import type { SaleRepository } from "../../domain/SaleRepository";
import { Sale } from "../../domain/Sale";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/SaleRepository";
import type { ReleaseStock } from "../ports/ReleaseStock";

export class RegisterSale {
  constructor(
    private saleRepository: SaleRepository,
    private releaseStock: ReleaseStock
  ) {}
  execute(sale: Sale): Promise<Result<SaleNotFoundError, void>> {
    return this.saleRepository.registry(sale);
  }
}
