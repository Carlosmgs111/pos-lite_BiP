import type { PaymentRepository } from "../domain/PaymentRepository";
import { Payment, PaymentMethod, PaymentStatus } from "../domain/Payment";
import { Result } from "../../shared/domain/Result";
import { db, ensureSchema } from "../../shared/infrastructure/db";

interface PaymentRow {
  id: string;
  payment_order_id: string;
  method: string;
  amount_cents: number;
  status: string;
  version: number;
  created_at: string;
  external_id: string | null;
  completed_at: string | null;
}

function rowToPayment(row: PaymentRow): Payment {
  return Payment.reconstitute({
    id: row.id,
    paymentOrderId: row.payment_order_id,
    method: row.method as PaymentMethod,
    amount: row.amount_cents / 100,
    status: row.status as PaymentStatus,
    version: row.version,
    createdAt: new Date(row.created_at),
    externalId: row.external_id ?? undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  });
}

export class LibSqlPaymentRepository implements PaymentRepository {
  async save(payment: Payment): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = payment.getId().getValue();
    try {
      await db.execute({
        sql: `INSERT INTO payments
              (id, payment_order_id, method, amount_cents, status, version, created_at, external_id, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          payment.getPaymentOrderId(),
          payment.getMethod(),
          payment.getAmount().getValueInCents(),
          payment.getStatus(),
          payment.getVersion(),
          new Date().toISOString(),
          payment.getExternalId() ?? null,
          null,
        ],
      });
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async update(payment: Payment): Promise<Result<Error, void>> {
    await ensureSchema();
    const id = payment.getId().getValue();
    const prevVersion = payment.getVersion() - 1;
    try {
      const rs = await db.execute({
        sql: `UPDATE payments
              SET status = ?, version = ?, external_id = ?, completed_at = ?
              WHERE id = ? AND version = ?`,
        args: [
          payment.getStatus(),
          payment.getVersion(),
          payment.getExternalId() ?? null,
          payment.getStatus() === PaymentStatus.COMPLETED ? new Date().toISOString() : null,
          id,
          prevVersion,
        ],
      });
      if (rs.rowsAffected === 0) {
        return Result.fail(new Error(`Concurrent modification on Payment ${id}`));
      }
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findById(id: string): Promise<Result<Error, Payment | null>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, method, amount_cents, status, version, created_at, external_id, completed_at
              FROM payments WHERE id = ?`,
        args: [id],
      });
      if (rs.rows.length === 0) return Result.ok(null);
      return Result.ok(rowToPayment(rs.rows[0] as unknown as PaymentRow));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findByPaymentOrderId(orderId: string): Promise<Result<Error, Payment[]>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, method, amount_cents, status, version, created_at, external_id, completed_at
              FROM payments WHERE payment_order_id = ?`,
        args: [orderId],
      });
      return Result.ok(rs.rows.map((r: any) => rowToPayment(r as unknown as PaymentRow)));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findByExternalId(externalId: string): Promise<Result<Error, Payment | null>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, method, amount_cents, status, version, created_at, external_id, completed_at
              FROM payments WHERE external_id = ?`,
        args: [externalId],
      });
      if (rs.rows.length === 0) return Result.ok(null);
      return Result.ok(rowToPayment(rs.rows[0] as unknown as PaymentRow));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async purgeDb(): Promise<void> {
    await ensureSchema();
    await db.execute(`DELETE FROM payments`);
  }
}
