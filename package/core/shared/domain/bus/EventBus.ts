import type { EventHandler } from "./EventHandler";
import type { DomainEvent, EventName } from "../DomainEvent";

export interface EventBus {
  publish<K extends EventName>(event: DomainEvent<K>): Promise<void>;
  subscribe<K extends EventName>(
    eventName: K,
    handler: EventHandler<DomainEvent<K>>
  ): () => void;
}
