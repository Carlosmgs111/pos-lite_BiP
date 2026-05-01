import type { ProcessedEventRepository } from "../application/ProcessedEventRepository";
import { db, ensureSchema } from "./db";

export class LibSqlProcessedEventRepository implements ProcessedEventRepository {
  async hasBeenProcessed(eventId: string, handler: string): Promise<boolean> {
    await ensureSchema();
    const rs = await db.execute({
      sql: `SELECT 1 FROM processed_events WHERE event_id = ? AND handler = ?`,
      args: [eventId, handler],
    });
    return rs.rows.length > 0;
  }

  async markAsProcessed(eventId: string, handler: string): Promise<void> {
    await ensureSchema();
    await db.execute({
      sql: `INSERT OR IGNORE INTO processed_events (event_id, handler) VALUES (?, ?)`,
      args: [eventId, handler],
    });
  }

  async purgeDb(): Promise<void> {
    await ensureSchema();
    await db.execute(`DELETE FROM processed_events`);
  }
}
