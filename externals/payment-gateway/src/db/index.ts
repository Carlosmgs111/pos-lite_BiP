import { createClient } from "@libsql/client";
import type { Transaction } from "../services";

const db = createClient({
  url: process.env.GATEWAY_DB_URL || "file:externals/payment-gateway/gateway.db",
});

export async function ensureSchema(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      method TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  await db.execute({
    sql: `INSERT INTO transactions (id, status, amount, currency, method, description, metadata, created_at, resolved_at)
          VALUES (:id, :status, :amount, :currency, :method, :description, :metadata, :created_at, :resolved_at)`,
    args: {
      id: tx.id,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      method: tx.method,
      description: tx.description,
      metadata: JSON.stringify(tx.metadata),
      created_at: tx.created_at,
      resolved_at: tx.resolved_at,
    },
  });
}

export async function updateTransactionStatus(id: string, status: string, resolvedAt: string): Promise<void> {
  await db.execute({
    sql: `UPDATE transactions SET status = :status, resolved_at = :resolvedAt WHERE id = :id`,
    args: { id, status, resolvedAt },
  });
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const result = await db.execute({
    sql: `SELECT * FROM transactions WHERE id = :id`,
    args: { id },
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    status: row.status as string,
    amount: row.amount as number,
    currency: row.currency as string,
    method: row.method as string,
    description: row.description as string,
    metadata: JSON.parse(row.metadata as string),
    created_at: row.created_at as string,
    resolved_at: row.resolved_at as string | null,
  };
}

export async function seedTransactions(transactions: Transaction[]): Promise<void> {
  for (const tx of transactions) {
    await insertTransaction(tx);
  }
}
