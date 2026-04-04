import type { SaleRepository } from "../../domain/SaleRepository";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import type { Sale } from "../../domain/Sale";

export class GetSale {
  constructor(private saleRepository: SaleRepository) {}
  async execute(saleId: string): Promise<Result<SaleNotFoundError, Sale>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    return Result.ok(saleResult.getValue()!);
  }
}
