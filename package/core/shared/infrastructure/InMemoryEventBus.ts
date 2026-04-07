import type { EventBus } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();
  private static instance: InMemoryEventBus;

  private constructor() {}

  static create() {
    if (!InMemoryEventBus.instance) {
      InMemoryEventBus.instance = new InMemoryEventBus();
    }
    return InMemoryEventBus.instance;
  }
  async publish(event: any): Promise<void> {
    const eventName = event.constructor.name;
    const handlers = this.handlers.get(eventName) || [];
    handlers.forEach((handler) => handler.handle.call(handler, event));
  }
  subscribe(event: string, handler: EventHandler<any>): void {
    const currentHandlers = this.handlers.get(event) || [];
    this.handlers.set(event, [...currentHandlers, handler]);
  }
}
