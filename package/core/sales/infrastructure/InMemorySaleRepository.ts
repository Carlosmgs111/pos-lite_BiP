import { Sale } from "../domain/Sale";
import type { SaleRepository } from "../domain/SaleRepository";
import { Result } from "../../shared/domain/Result";

export class InMemorySaleRepository implements SaleRepository {
  private sales: Sale[] = [];
  save(sale: Sale): Promise<Result<Error, void>> {
    this.sales.push(sale);
    return Promise.resolve(Result.ok(undefined));
  }
  async getSaleById(id: string): Promise<Result<Error, Sale | undefined>> {
    const sale = this.sales.find((sale) => sale.getId() === id);
    if (!sale) {
      return Result.ok(undefined);
    }
    return Result.ok(sale);
  }
  async update(sale: Sale): Promise<Result<Error, void>> {
    const index = this.sales.findIndex((s) => s.getId() === sale.getId());
    if (index === -1) {
      return Result.fail(new Error("Sale not found"));
    }
    this.sales[index] = sale;
    return Result.ok(undefined);
  }
  async delete(saleId: string): Promise<Result<Error, void>> {
    const index = this.sales.findIndex((s) => s.getId() === saleId);
    if (index === -1) {
      return Result.fail(new Error("Sale not found"));
    }
    this.sales.splice(index, 1);
    return Result.ok(undefined);
  }
  purgeDb() {
    this.sales = [];
  }
}
