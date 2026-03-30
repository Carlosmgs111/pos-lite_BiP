import { Sale } from "../domain/Sale";
import type { SaleRepository } from "../domain/SaleRepository";

export class InMemorySaleRepository implements SaleRepository {
  private sales: Sale[] = [];
  registry(sale: Sale): Promise<void> {
    this.sales.push(sale);
    return Promise.resolve();
  }
  getSale(id: string): Promise<Sale> {
    const sale = this.sales.find((sale) => sale.getId() === id);
    if (!sale) {
      throw new Error("Sale not found");
    }
    return Promise.resolve(sale);
  }
  async update(sale: Sale): Promise<void> {
    const index = this.sales.findIndex((s) => s.getId() === sale.getId());
    if (index === -1) {
      throw new Error("Sale not found");
    }
    this.sales[index] = sale;
  }
  purgeDb() {
    this.sales = [];
  }
}
