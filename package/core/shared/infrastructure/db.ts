import { createClient } from "@libsql/client";

const DATABASE_URL = import.meta.env.DATABASE_URL || "file:local.db";
const DATABASE_AUTH_TOKEN = import.meta.env.DATABASE_AUTH_TOKEN;

export const db = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

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
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  pending_amount_cents INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  change_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_order_id TEXT NOT NULL,
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  external_id TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
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
  await db.execute(SCHEMA);
  initialized = true;
}
