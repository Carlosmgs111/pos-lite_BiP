import type { EventBus } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";
import type { DomainEvent, EventName } from "../domain/DomainEvent";

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<DomainEvent<any>>>>();

  private async executeHandler(
    handler: EventHandler<DomainEvent<any>>,
    event: DomainEvent<any>
  ): Promise<void> {
    try {
      const result = await handler.handle(event);
  
      if (!result.isSuccess) {
        await this.onFailure(handler, event, result.getError());
      }
  
    } catch (error) {
      await this.onFailure(handler, event, error as Error);
    }
  }

  private async onFailure(
    handler: EventHandler<DomainEvent<any>>,
    event: DomainEvent<any>,
    error: Error
  ): Promise<void> {
    // mínimo: observabilidad
    console.error(`[EventBus] Handler failed`, {
      event: event.eventName,
      handler: handler.constructor.name,
      error: error.message,
    });
  }
  
  async publish<K extends EventName>(event: DomainEvent<K>): Promise<void> {
    const set = this.handlers.get(event.eventName);
    if (!set) return;
  
    const executions = Array.from(set).map(handler =>
      this.executeHandler(handler, event)
    );
  
    await Promise.all(executions);
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
