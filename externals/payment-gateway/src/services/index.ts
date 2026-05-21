export enum TransactionStatus {
  PROCESSING = "PROCESSING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

type Currency = "COP" | "USD";
type MethodType = "CARD" | "TRANSFER";

export interface PaymentPayload {
  amount: number;
  currency: Currency;
  method: MethodType;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  method: MethodType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

import http from "node:http";
import https from "node:https";
import { ensureSchema, insertTransaction, updateTransactionStatus, getTransactionById } from "../db";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:4321/api/payment/webhook";
const FAILURE_RATE = 0.2;
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 20000;

console.log("[WEBHOOK URL]: ", WEBHOOK_URL)

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

async function resolveTransaction(transactionId: string): Promise<void> {
  const tx = await getTransactionById(transactionId);
  if (!tx || tx.status !== TransactionStatus.PROCESSING) return;

  const success = Math.random() > FAILURE_RATE;
  const newStatus = success ? TransactionStatus.SUCCEEDED : TransactionStatus.FAILED;
  const resolvedAt = new Date().toISOString();

  await updateTransactionStatus(transactionId, newStatus, resolvedAt);

  console.log(`[gateway] ${tx.id} → ${newStatus}`);

  const payload = JSON.stringify({
    paymentId: tx.metadata.payment_id ?? tx.id,
    success,
    transaction_id: tx.id,
  });

  const url = new URL(WEBHOOK_URL);
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;
  const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = client.request(options, (res: any) => {
      console.log(`[gateway] webhook → ${res.statusCode}`);
    });
    req.on("error", (err: Error) => {
      console.log(`[gateway] webhook error: ${err.message}`);
    });
  req.write(payload);
  req.end();
}

export async function processPayment(payload: PaymentPayload): Promise<Transaction> {
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    status: TransactionStatus.PROCESSING,
    amount: payload.amount,
    currency: payload.currency,
    method: payload.method,
    description: payload.description ?? "",
    metadata: payload.metadata ?? {},
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  await insertTransaction(transaction);
  console.log(`[gateway] transaction ${transaction.id} created — PROCESSING`);

  setTimeout(() => resolveTransaction(transaction.id), randomDelay());

  return transaction;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  return await getTransactionById(id);
}

export async function initDB(): Promise<void> {
  await ensureSchema();

  const seedData = [
    {
      id: "bb8d60c0-99f5-43d7-90aa-8a5a79e282e4",
      status: TransactionStatus.SUCCEEDED,
      amount: 100000,
      currency: "COP",
      method: "CARD",
      description: "Seeded transaction 1",
      metadata: {},
      created_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    },
    {
      id: "3237440f-4d6c-4b35-a648-e44ecc717552",
      status: TransactionStatus.SUCCEEDED,
      amount: 200000,
      currency: "COP",
      method: "TRANSFER",
      description: "Seeded transaction 2",
      metadata: {},
      created_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    },
    {
      id: "232b68f9-f951-41d0-99f6-7e507cdfd316",
      status: TransactionStatus.SUCCEEDED,
      amount: 150000,
      currency: "COP",
      method: "CARD",
      description: "Seeded transaction 3",
      metadata: {},
      created_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    },
  ];

  for (const tx of seedData) {
    try {
      await insertTransaction(tx);
      console.log(`[gateway] seeded transaction ${tx.id}`);
    } catch (e) {
      console.log(`[gateway] seed ${tx.id} already exists or error: ${e}`);
    }
  }
}
