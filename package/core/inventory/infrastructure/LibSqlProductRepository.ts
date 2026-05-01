import type { ProductRepository } from "../domain/ProductRepository";
import { Product } from "../domain/Product";
import { Result } from "../../shared/domain/Result";
import { db, ensureSchema } from "../../shared/infrastructure/db";

interface ProductRow {
  name: string;
  price_cents: number;
  stock: number;
  reserved_stock: number;
  committed_stock: number;
  version: number;
}

function rowToProduct(id: string, row: ProductRow): Product {
  return Product.reconstitute({
    id,
    name: row.name,
    price: row.price_cents / 100,
    stock: row.stock,
    reservedStock: row.reserved_stock,
    committedStock: row.committed_stock,
    version: row.version,
  });
}

export class LibSqlProductRepository implements ProductRepository {
  async registry(product: Product): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = product.getId().getValue();
    try {
      await db.execute({
        sql: `INSERT INTO products (id, name, price_cents, stock, reserved_stock, committed_stock, version)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, product.getName(), product.getPrice() * 100, product.getStock(), product.getReservedStock(), 0, product.getVersion()],
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async getProducts(productIds: string[]): Promise<Result<Error, Product[]>> {
    await ensureSchema();
    const placeholders = productIds.map(() => "?").join(",");
    try {
      const rs = await db.execute({
        sql: `SELECT id, name, price_cents, stock, reserved_stock, committed_stock, version
              FROM products WHERE id IN (${placeholders})`,
        args: productIds,
      });
      const products = rs.rows.map((r: any) => rowToProduct(r.id as string, r as unknown as ProductRow));
      return Result.ok(products);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async listProducts(): Promise<Result<Error, Product[]>> {
    await ensureSchema();
    try {
      const rs = await db.execute(
        `SELECT id, name, price_cents, stock, reserved_stock, committed_stock, version FROM products`
      );
      const products = rs.rows.map((r: any) => rowToProduct(r.id as string, r as unknown as ProductRow));
      return Result.ok(products);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async update(product: Product): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = product.getId().getValue();
    const prevVersion = product.getVersion() - 1;
    try {
      const rs = await db.execute({
        sql: `UPDATE products
              SET name = ?, price_cents = ?, stock = ?, reserved_stock = ?, committed_stock = ?, version = ?
              WHERE id = ? AND version = ?`,
        args: [product.getName(), product.getPrice() * 100, product.getStock(), product.getReservedStock(), 0, product.getVersion(), id, prevVersion],
      });
      if (rs.rowsAffected === 0) {
        return Result.fail(new Error(`Concurrent modification on Product ${id}`));
      }
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async purgeDb(): Promise<void> {
    await ensureSchema();
    await db.execute(`DELETE FROM products`);
  }
}
