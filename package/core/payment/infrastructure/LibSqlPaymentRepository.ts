// 🛠️ FASE 6: Repos LibSQL — PaymentRepository expandido con ledger fields
// ! [ANTES] payments no persistía type, settlement_source, external_reference, notes, original_payment_id
// ? [DESPUÉS] Ledger completo: type (CHARGE/REFUND), settlement_source, audit fields
import type { PaymentRepository } from "../domain/PaymentRepository";
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PaymentSettlementSource,
} from "../domain/Payment";
import { Result } from "../../shared/domain/Result";
import { db, ensureSchema } from "../../shared/infrastructure/db";

interface PaymentRow {
  id: string;
  payment_order_id: string;
  type: string;
  method: string;
  amount_cents: number;
  status: string;
  settlement_source: string | null;
  external_reference: string | null;
  notes: string | null;
  original_payment_id: string | null;
  version: number;
  created_at: string;
  external_id: string | null;
  completed_at: string | null;
}

function rowToPayment(row: PaymentRow): Payment {
  return Payment.reconstitute({
    id: row.id,
    paymentOrderId: row.payment_order_id,
    type: row.type as PaymentType,
    method: row.method as PaymentMethod,
    amount: row.amount_cents / 100,
    status: row.status as PaymentStatus,
    version: row.version,
    createdAt: new Date(row.created_at),
    settlementSource: row.settlement_source
      ? (row.settlement_source as PaymentSettlementSource)
      : undefined,
    externalReference: row.external_reference ?? undefined,
    notes: row.notes ?? undefined,
    originalPaymentId: row.original_payment_id ?? undefined,
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
              (id, payment_order_id, type, method, amount_cents, status, version, created_at,
               settlement_source, external_reference, notes, original_payment_id, external_id, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          payment.getPaymentOrderId(),
          payment.getType(),
          payment.getMethod(),
          payment.getAmount().getValueInCents(),
          payment.getStatus(),
          payment.getVersion(),
          new Date().toISOString(),
          payment.getSettlementSource() ?? null,
          payment.getExternalReference() ?? null,
          payment.getNotes() ?? null,
          payment.getOriginalPaymentId() ?? null,
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
              SET status = ?, version = ?, settlement_source = ?, external_reference = ?,
                  notes = ?, external_id = ?, completed_at = ?
              WHERE id = ? AND version = ?`,
        args: [
          payment.getStatus(),
          payment.getVersion(),
          payment.getSettlementSource() ?? null,
          payment.getExternalReference() ?? null,
          payment.getNotes() ?? null,
          payment.getExternalId() ?? null,
          payment.getStatus() === PaymentStatus.COMPLETED
            ? new Date().toISOString()
            : null,
          id,
          prevVersion,
        ],
      });
      if (rs.rowsAffected === 0) {
        return Result.fail(
          new Error(`Concurrent modification on Payment ${id}`)
        );
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
        sql: `SELECT id, payment_order_id, type, method, amount_cents, status, version, created_at,
                     settlement_source, external_reference, notes, original_payment_id, external_id, completed_at
              FROM payments WHERE id = ?`,
        args: [id],
      });
      if (rs.rows.length === 0) return Result.ok(null);
      return Result.ok(rowToPayment(rs.rows[0] as unknown as PaymentRow));
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findByPaymentOrderId(
    orderId: string
  ): Promise<Result<Error, Payment[]>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, type, method, amount_cents, status, version, created_at,
                     settlement_source, external_reference, notes, original_payment_id, external_id, completed_at
              FROM payments WHERE payment_order_id = ?`,
        args: [orderId],
      });
      return Result.ok(
        rs.rows.map((r: any) => rowToPayment(r as unknown as PaymentRow))
      );
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findPendingByPaymentOrderId(
    orderId: string
  ): Promise<Result<Error, Payment[]>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, type, method, amount_cents, status, version, created_at,
                     settlement_source, external_reference, notes, original_payment_id, external_id, completed_at
              FROM payments WHERE payment_order_id = ? AND status = ?`,
        args: [orderId, PaymentStatus.PENDING],
      });
      return Result.ok(
        rs.rows.map((r: any) => rowToPayment(r as unknown as PaymentRow))
      );
    } catch (e) {
      return Result.fail(e as Error);
    }
  }

  async findByExternalId(
    externalId: string
  ): Promise<Result<Error, Payment | null>> {
    await ensureSchema();
    try {
      const rs = await db.execute({
        sql: `SELECT id, payment_order_id, type, method, amount_cents, status, version, created_at,
                     settlement_source, external_reference, notes, original_payment_id, external_id, completed_at
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
