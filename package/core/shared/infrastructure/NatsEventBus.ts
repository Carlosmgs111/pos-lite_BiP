import type { EventBus, RetryPolicy } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";
import type { DomainEvent, EventName } from "../domain/DomainEvent";
import { publishSubject, subscribeSubject } from "./nats";

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: (attempt) => Math.pow(2, attempt) * 100,
};

function subjectName(eventName: string): string {
  return `pos.${eventName}`;
}

export class NatsEventBus implements EventBus {
  private subscriptions = new Map<string, Array<() => void>>();

  constructor(private retryPolicy: RetryPolicy = defaultRetryPolicy) {}

  async publish<K extends EventName>(event: DomainEvent<K>): Promise<void> {
    const subject = subjectName(event.eventName);
    try {
      await publishSubject(subject, {
        id: event.id,
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        payload: event.payload,
        occurredAt: event.occurredAt,
        version: (event as any).version,
      });
    } catch (e) {
      console.error(`[NatsEventBus] publish error on ${subject}`, e);
    }
  }

  subscribe<K extends EventName>(
    eventName: K,
    handler: EventHandler<DomainEvent<K>>
  ): () => void {
    const subject = subjectName(eventName);

    const unsub = subscribeSubject(subject, async (data: any) => {
      const event: DomainEvent<K> = {
        id: data.id,
        eventName: data.eventName as K,
        aggregateId: data.aggregateId,
        payload: data.payload,
        occurredAt: new Date(data.occurredAt),
      };
      (event as any).version = data.version;

      try {
        await this.executeWithRetry(handler, event);
      } catch (e) {
        console.error(`[NatsEventBus] handler error on ${eventName}`, e);
      }
    });

    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, []);
    }
    this.subscriptions.get(eventName)!.push(unsub);

    return () => {
      unsub();
      const subs = this.subscriptions.get(eventName);
      if (subs) {
        const idx = subs.indexOf(unsub);
        if (idx >= 0) subs.splice(idx, 1);
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithRetry<K extends EventName>(
    handler: EventHandler<DomainEvent<K>>,
    event: DomainEvent<K>
  ): Promise<void> {
    const { maxAttempts, backoffMs } = this.retryPolicy;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await handler.handle(event);
        if (result.isSuccess) return;
        throw result.getError();
      } catch (error) {
        const err = error as Error;
        console.error("[NatsEventBus] handler failed", {
          event: event.eventName,
          handler: handler.constructor.name,
          attempt,
          error: err.message,
        });
        if (attempt === maxAttempts) {
          console.error("[NatsEventBus] final failure", {
            event: event.eventName,
            handler: handler.constructor.name,
          });
          return;
        }
        await this.delay(backoffMs(attempt));
      }
    }
  }
}
