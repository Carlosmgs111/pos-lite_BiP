import { InMemoryEventBus } from "../infrastructure/InMemoryEventBus";
import { NatsEventBus } from "../infrastructure/NatsEventBus";

const busType = import.meta.env.POS_EVENT_BUS || "memory";

export const eventBus =
  busType === "nats" ? new NatsEventBus() : new InMemoryEventBus();
