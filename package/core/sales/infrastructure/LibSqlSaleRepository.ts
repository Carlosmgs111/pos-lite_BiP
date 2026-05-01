import type { SaleRepository } from "../domain/SaleRepository";
import { Sale } from "../domain/Sale";
import { SaleStatus } from "../domain/SaleStatus";
import type { SaleItemProps } from "../domain/SaleItem";
import { Result } from "../../shared/domain/Result";
import { db, ensureSchema } from "../../shared/infrastructure/db";

export class LibSqlSaleRepository implements SaleRepository {
  async save(sale: Sale): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = sale.getId().getValue();
    const itemsJson = JSON.stringify(sale.getItems().map((i) => i.serialize()));
    try {
      await db.execute({
        sql: `INSERT INTO sales (id, items_json, total_cents, created_at, status, version)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, itemsJson, sale.getTotal().getValueInCents(), new Date().toISOString(), sale.getStatus(), sale.getVersion()],
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async getSaleById(id: string): Promise<Result<Error, Sale | undefined>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, items_json, total_cents, created_at, status, version FROM sales WHERE id = ?`,
        args: [id],
      });
      if (rs.rows.length === 0) return Result.ok(undefined);
      const row = rs.rows[0] as any;
      const items: Array<SaleItemProps & { subTotal: number }> = JSON.parse(row.items_json as string);
      const sale = Sale.reconstitute({
        id: row.id as string,
        items,
        total: (row.total_cents as number) / 100,
        createdAt: new Date(row.created_at as string),
        status: row.status as SaleStatus,
        version: row.version as number,
      });
      return Result.ok(sale);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async update(sale: Sale): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = sale.getId().getValue();
    const prevVersion = sale.getVersion() - 1;
    const itemsJson = JSON.stringify(sale.getItems().map((i) => i.serialize()));
    try {
      const rs = await db.execute({
        sql: `UPDATE sales
              SET items_json = ?, total_cents = ?, status = ?, version = ?
              WHERE id = ? AND version = ?`,
        args: [itemsJson, sale.getTotal().getValueInCents(), sale.getStatus(), sale.getVersion(), id, prevVersion],
      });
      if (rs.rowsAffected === 0) {
        return Result.fail(new Error(`Concurrent modification on Sale ${id}`));
      }
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async delete(saleId: string): Promise<Result<Error, void>> {
    await ensureSchema();
    try {
      await db.execute({ sql: `DELETE FROM sales WHERE id = ?`, args: [saleId] });
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async purgeDb(): Promise<void> {
    await ensureSchema();
    await db.execute(`DELETE FROM sales`);
  }
}
