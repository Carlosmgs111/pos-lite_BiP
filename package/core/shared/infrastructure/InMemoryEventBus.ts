import type { EventBus } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";
import type { DomainEvent, EventName } from "../domain/DomainEvent";

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<DomainEvent<any>>>>();

  async publish<K extends EventName>(event: DomainEvent<K>): Promise<void> {
    const set = this.handlers.get(event.eventName);
    if (!set) return;
    for (const handler of set) {
      await handler.handle(event);
    }
  }

  subscribe<K extends EventName>(
    eventName: K,
    handler: EventHandler<DomainEvent<K>>
  ): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    const set = this.handlers.get(eventName)!;
    set.add(handler as EventHandler<DomainEvent<any>>);
    return () => {
      set.delete(handler as EventHandler<DomainEvent<any>>);
      if (set.size === 0) this.handlers.delete(eventName);
    };
  }
}
