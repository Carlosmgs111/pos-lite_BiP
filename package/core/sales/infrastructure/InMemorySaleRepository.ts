import { Sale } from "../domain/Sale";
import type { SaleRepository } from "../domain/SaleRepository";
import { Result } from "../../shared/domain/Result";
import { SaleNotFoundError } from "../domain/SaleRepository";

export class InMemorySaleRepository implements SaleRepository {
  private sales: Sale[] = [];
  registry(sale: Sale): Promise<Result<SaleNotFoundError, void>> {
    this.sales.push(sale);
    return Promise.resolve(Result.ok());
  }
  async getSaleById(id: string): Promise<Result<SaleNotFoundError, Sale>> {
    const sale = this.sales.find((sale) => sale.getId() === id);
    if (!sale) {
      return Result.fail(new SaleNotFoundError());
    }
    return Result.ok(sale);
  }
  async update(sale: Sale): Promise<Result<SaleNotFoundError, void>> {
    const index = this.sales.findIndex((s) => s.getId() === sale.getId());
    if (index === -1) {
      return Result.fail(new SaleNotFoundError());
    }
    this.sales[index] = sale;
    return Result.ok();
  }
  purgeDb() {
    this.sales = [];
  }
}
