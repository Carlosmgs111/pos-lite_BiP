import type { EventBus } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";
import type { DomainEvent, EventName } from "../domain/DomaintEvent";

export interface EventFilter<K extends EventName = EventName> {
  eventName: K;
  where?: (event: DomainEvent<K>) => boolean;
}

export function subscribeWithFilter(
  bus: EventBus,
  filters: EventFilter[],
  handler: EventHandler<DomainEvent>
): () => void {
  const unsubscribers = filters.map((filter) =>
    bus.subscribe(filter.eventName, {
      handle: async (event) => {
        if (filter.where && !filter.where(event)) return;
        await handler.handle(event);
      },
    })
  );

  return () => unsubscribers.forEach((u) => u());
}
