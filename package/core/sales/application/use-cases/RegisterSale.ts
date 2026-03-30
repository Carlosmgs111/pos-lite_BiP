import type { SaleRepository } from "../../domain/SaleRepository";
import { Sale } from "../../domain/Sale";
import { SaleStates } from "../../domain/SaleStates";

export class RegisterSale {
  constructor(private saleRepository: SaleRepository) {}
  execute(sale: Sale): Promise<void> {
    sale.calculateTotal();
    return this.saleRepository.registry(sale);
  }
}
 