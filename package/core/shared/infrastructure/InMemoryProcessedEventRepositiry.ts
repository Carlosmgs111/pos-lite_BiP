import type { ProcessedEventRepository } from "../application/ProcessedEventRepository";

export class InMemoryProcessedEventRepositiry implements ProcessedEventRepository {
  private events = new Map<string, Set<string>>();

  async hasBeenProcessed(eventId: string, handler: string): Promise<boolean> {
    console.log("[InMemoryProcessedEventRepositiry] hasBeenProcessed", eventId, handler);
    return this.events.has(eventId) && this.events.get(eventId)!.has(handler);
  }

  async markAsProcessed(eventId: string, handler: string): Promise<void> {
    console.log("[InMemoryProcessedEventRepositiry] markAsProcessed", eventId, handler);
    if (!this.events.has(eventId)) {
      this.events.set(eventId, new Set());
    }
    this.events.get(eventId)!.add(handler);
  }
}
