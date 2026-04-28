import type { EventBus, RetryPolicy } from "../domain/bus/EventBus";
import type { EventHandler } from "../domain/bus/EventHandler";
import type { DomainEvent, EventName } from "../domain/DomainEvent";

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: (attempt) => Math.pow(2, attempt) * 100, // 100ms, 200ms, 400ms
};

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<DomainEvent<any>>>>();

  constructor(private retryPolicy: RetryPolicy = defaultRetryPolicy) {}

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private logFailure(
    handler: EventHandler<DomainEvent<any>>,
    event: DomainEvent<any>,
    error: Error,
    attempt: number
  ) {
    console.error("[EventBus] Handler failed", {
      event: event.eventName,
      handler: handler.constructor.name,
      attempt,
      error: error.message,
    });
  }

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

  private async onFinalFailure(
    handler: EventHandler<DomainEvent<any>>,
    event: DomainEvent<any>,
    error: Error
  ): Promise<void> {
    // por ahora solo log
    this.logFailure(handler, event, error, this.retryPolicy.maxAttempts);
  
    // siguiente paso:
    // await deadLetterRepository.save(...)
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

  private async executeWithRetry(
    handler: EventHandler<DomainEvent<any>>,
    event: DomainEvent<any>
  ): Promise<void> {
    const { maxAttempts, backoffMs } = this.retryPolicy;
  
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await handler.handle(event);
  
        if (result.isSuccess) return;
  
        throw result.getError();
  
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
  
        this.onFailure(handler, event, error as Error);
  
        if (isLastAttempt) {
          await this.onFinalFailure(handler, event, error as Error);
          return;
        }
  
        await this.delay(backoffMs(attempt));
      }
    }
  }

  async publish<K extends EventName>(event: DomainEvent<K>): Promise<void> {
    const set = this.handlers.get(event.eventName);
    if (!set) return;
  
    const executions = Array.from(set).map(handler =>
      this.executeWithRetry(handler, event)
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
