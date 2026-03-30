import { Result } from "../../../shared/domain/Result";
import type { SaleRepository } from "../../domain/SaleRepository";

export class RemoveItemFromSale {
  constructor(private saleRepository: SaleRepository) {}
  async execute({
    saleId,
    itemId,
    quantity,
  }: {
    saleId: string;
    itemId: string;
    quantity: number;
  }): Promise<Result<Error, boolean>> {
    const sale = await this.saleRepository.getSale(saleId);
    if (!sale) {
      return Result.fail(new Error("Sale not found"));
    }
    sale.removeItem(itemId, quantity);
    await this.saleRepository.update(sale);
    return Result.ok(true);
  }
}
