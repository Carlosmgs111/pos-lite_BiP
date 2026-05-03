import { connect, type NatsConnection, JSONCodec, type Subscription } from "nats";

const DEFAULT_URL = "localhost:4222";

let nc: NatsConnection | null = null;
let connectionPromise: Promise<NatsConnection> | null = null;

export const jc = JSONCodec();

export async function getNatsConnection(): Promise<NatsConnection> {
  if (nc && !nc.isClosed()) return nc;

  if (!connectionPromise) {
    const url = import.meta.env.NATS_URL || DEFAULT_URL;
    console.log("[NATS] connecting to", url);
    connectionPromise = connect({ servers: url }).then((conn) => {
      nc = conn;
      console.log("[NATS] connected");
      (async () => {
        const err = await conn.closed();
        console.error("[NATS] connection closed", err?.message ?? "clean");
        nc = null;
        connectionPromise = null;
      })();
      return conn;
    });
  }

  return connectionPromise;
}

export function subscribeSubject(
  subject: string,
  callback: (data: unknown) => void
): () => void {
  let sub: Subscription | null = null;
  let unsubscribed = false;

  getNatsConnection().then((conn) => {
    if (unsubscribed) return;
    sub = conn.subscribe(subject, {
      callback: (_err, msg) => {
        try {
          const decoded = jc.decode(msg.data);
          callback(decoded);
        } catch (e) {
          console.error("[NATS] decode error on", subject, e);
        }
      },
    });
  });

  return () => {
    unsubscribed = true;
    if (sub) sub.unsubscribe();
  };
}

export async function publishSubject(
  subject: string,
  data: unknown
): Promise<void> {
  const conn = await getNatsConnection();
  const encoded = jc.encode(data);
  conn.publish(subject, encoded);
}
