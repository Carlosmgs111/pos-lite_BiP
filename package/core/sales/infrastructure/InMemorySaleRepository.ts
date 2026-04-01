import { Sale } from "../domain/Sale";
import type { SaleRepository } from "../domain/SaleRepository";
import { Result } from "../../shared/domain/Result";

export class InMemorySaleRepository implements SaleRepository {
  private sales: Sale[] = [];
  save(sale: Sale): Promise<Result<Error, void>> {
    this.sales.push(sale);
    return Promise.resolve(Result.ok());
  }
  async getSaleById(id: string): Promise<Result<Error, Sale | undefined>> {
    const sale = this.sales.find((sale) => sale.getId() === id);
    if (!sale) {
      return Result.ok(undefined);
    }
    return Result.ok(sale);
  }
  async update(sale: Sale): Promise<Result<Error, void>> {
    const saleResult = await this.getSaleById(sale.getId());
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new Error("Sale not found"));
    }
    const index = this.sales.findIndex((sale) => sale.getId() === sale.getId());
    this.sales[index] = sale;
    return Result.ok();
  }
  async delete(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new Error("Sale not found"));
    }
    const index = this.sales.findIndex((sale) => sale.getId() === sale.getId());
    this.sales.splice(index, 1);
    return Result.ok();
  }
  purgeDb() {
    this.sales = [];
  }
}
