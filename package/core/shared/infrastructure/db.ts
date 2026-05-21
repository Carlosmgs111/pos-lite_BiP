import { createClient } from "@libsql/client";
import path from "path";

const DEFAULT_DB = `file:${path.resolve("local.db")}`;
const DATABASE_URL = import.meta.env.DATABASE_URL || DEFAULT_DB;
const DATABASE_AUTH_TOKEN = import.meta.env.DATABASE_AUTH_TOKEN;

console.log(`[db] DATABASE_URL=${DATABASE_URL}`);
console.log(`[db] DEFAULT_DB=${DEFAULT_DB}`);

export const db = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

// 🛠️ FASE 5: Schema DB — PaymentOrder simplificado, Payments expandido
// ! [ANTES] payment_orders tenía campos contables (paid_amount, pending_amount, failed_attempts, change_cents); payments no tenía type ni settlement info
// ? [DESPUÉS] payment_orders solo workflow; payments es ledger completo con type, settlement_source, original_payment_id

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  committed_stock INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  items_json TEXT NOT NULL DEFAULT '[]',
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL UNIQUE,
  total_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_order_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'CHARGE',
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  settlement_source TEXT,
  external_reference TEXT,
  notes TEXT,
  original_payment_id TEXT,
  external_id TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_original_id ON payments(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_sale_id ON payment_orders(sale_id);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT NOT NULL,
  handler TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, handler)
);
`;

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const statements = SCHEMA
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await db.execute(stmt);
  }

  // 🛠️ MIGRACIÓN: Agregar columnas nuevas a tablas existentes
  // SQLite no soporta ALTER TABLE ADD COLUMN IF NOT EXISTS, así que
  // intentamos agregar y ignoramos el error si la columna ya existe.
  const migrations = [
    `ALTER TABLE payments ADD COLUMN type TEXT DEFAULT 'CHARGE'`,
    `ALTER TABLE payments ADD COLUMN settlement_source TEXT`,
    `ALTER TABLE payments ADD COLUMN external_reference TEXT`,
    `ALTER TABLE payments ADD COLUMN notes TEXT`,
    `ALTER TABLE payments ADD COLUMN original_payment_id TEXT`,
  ];

  for (const migration of migrations) {
    try {
      await db.execute(migration);
    } catch {
      // La columna ya existe — ignorar
    }
  }

  initialized = true;
}
