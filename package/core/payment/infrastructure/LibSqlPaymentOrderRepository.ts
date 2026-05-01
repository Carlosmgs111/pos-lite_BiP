import type { PaymentOrderRepository } from "../domain/PaymentOrderRepository";
import { PaymentOrder, PaymentOrderStatus } from "../domain/PaymentOrder";
import { Result } from "../../shared/domain/Result";
import { db, ensureSchema } from "../../shared/infrastructure/db";

interface PaymentOrderRow {
  id: string;
  sale_id: string;
  total_amount_cents: number;
  paid_amount_cents: number;
  pending_amount_cents: number;
  failed_attempts: number;
  change_cents: number;
  status: string;
  version: number;
  created_at: string;
  completed_at: string | null;
}

function rowToPaymentOrder(row: PaymentOrderRow): PaymentOrder {
  return PaymentOrder.reconstitute({
    id: row.id,
    saleId: row.sale_id,
    totalAmount: row.total_amount_cents / 100,
    paidAmount: row.paid_amount_cents / 100,
    pendingAmount: row.pending_amount_cents / 100,
    failedAttempts: row.failed_attempts,
    change: row.change_cents / 100,
    status: row.status as PaymentOrderStatus,
    version: row.version,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  });
}

export class LibSqlPaymentOrderRepository implements PaymentOrderRepository {
  async save(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = paymentOrder.getId().getValue();
    try {
      await db.execute({
        sql: `INSERT INTO payment_orders
              (id, sale_id, total_amount_cents, paid_amount_cents, pending_amount_cents,
               failed_attempts, change_cents, status, version, created_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          paymentOrder.getSaleId().getValue(),
          paymentOrder.getTotalAmount().getValueInCents(),
          paymentOrder.getPaidAmount().getValueInCents(),
          0,
          paymentOrder.getFailedAttempts(),
          paymentOrder.getChange().getValueInCents(),
          paymentOrder.getStatus(),
          paymentOrder.getVersion(),
          new Date().toISOString(),
          null,
        ],
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async update(paymentOrder: PaymentOrder): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = paymentOrder.getId().getValue();
    const prevVersion = paymentOrder.getVersion() - 1;
    try {
      const rs = await db.execute({
        sql: `UPDATE payment_orders
              SET paid_amount_cents = ?, pending_amount_cents = ?, failed_attempts = ?,
                  change_cents = ?, status = ?, version = ?, completed_at = ?
              WHERE id = ? AND version = ?`,
        args: [
          paymentOrder.getPaidAmount().getValueInCents(),
          0,
          paymentOrder.getFailedAttempts(),
          paymentOrder.getChange().getValueInCents(),
          paymentOrder.getStatus(),
          paymentOrder.getVersion(),
          paymentOrder.getStatus() === PaymentOrderStatus.COMPLETED ? new Date().toISOString() : null,
          id,
          prevVersion,
        ],
      });
      if (rs.rowsAffected === 0) {
        return Result.fail(new Error(`Concurrent modification on PaymentOrder ${id}`));
      }
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findById(id: string): Promise<Result<Error, PaymentOrder | null>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, sale_id, total_amount_cents, paid_amount_cents, pending_amount_cents,
                     failed_attempts, change_cents, status, version, created_at, completed_at
              FROM payment_orders WHERE id = ?`,
        args: [id],
      });
      if (rs.rows.length === 0) return Result.ok(null);
      return Result.ok(rowToPaymentOrder(rs.rows[0] as unknown as PaymentOrderRow));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findBySaleId(saleId: string): Promise<Result<Error, PaymentOrder | null>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, sale_id, total_amount_cents, paid_amount_cents, pending_amount_cents,
                     failed_attempts, change_cents, status, version, created_at, completed_at
              FROM payment_orders WHERE sale_id = ?`,
        args: [saleId],
      });
      if (rs.rows.length === 0) return Result.ok(null);
      return Result.ok(rowToPaymentOrder(rs.rows[0] as unknown as PaymentOrderRow));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async purgeDb(): Promise<void> {
    await ensureSchema();
    await db.execute(`DELETE FROM payment_orders`);
  }
}
