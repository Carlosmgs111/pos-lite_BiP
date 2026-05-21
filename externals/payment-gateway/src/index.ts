import "dotenv/config";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { processPayment, getTransaction, initDB } from "./services";

// --- Utilities ---

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(res: ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    ...CORS_HEADERS,
  });
  res.end(payload);
}

// --- Route Handlers ---

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
type Routes = Record<string, Partial<Record<string, Handler>>>;

const routes: Routes = {
  "/process-payment": {
    POST: async (req, res) => {
      const raw = await readBody(req);
      let body: any;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }

      if (!body.amount || !body.currency || !body.method) {
        return json(res, 400, {
          error: "Required: amount, currency, method",
        });
      }

      const transaction = await processPayment(body);
      json(res, 201, {
        transaction_id: transaction.id,
        status: transaction.status,
      });
    },
  },

  "/transaction": {
    GET: async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const id = url.searchParams.get("id");
      if (!id) {
        return json(res, 400, { error: "Required query param: id" });
      }

      const tx = await getTransaction(id);
      if (!tx) {
        return json(res, 404, { error: "Transaction not found" });
      }

      json(res, 200, {
        transaction_id: tx.id,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        method: tx.method,
        created_at: tx.created_at,
        resolved_at: tx.resolved_at,
      });
    },
  },
};

// --- Server ---

const PORT = Number(process.env.GATEWAY_PORT) || 3000;

async function start() {
  // await initDB();

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const pathname = url.pathname;
      const method = req.method!;

      // CORS preflight
      if (method === "OPTIONS") {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
      }

      const route = routes[pathname];
      if (!route) {
        return json(res, 404, { error: "Endpoint not found" });
      }

      const handler = route[method];
      if (!handler) {
        return json(res, 405, { error: `Method ${method} not allowed` });
      }

      await handler(req, res);
    }
  );

  server.listen(PORT, () => {
    console.log(`\n  Payment Gateway Mock`);
    console.log(`  http://localhost:${PORT}\n`);
    console.log(`  POST /process-payment  — Create transaction`);
    console.log(`  GET  /transaction?id=  — Query status\n`);
  });
}

start();
