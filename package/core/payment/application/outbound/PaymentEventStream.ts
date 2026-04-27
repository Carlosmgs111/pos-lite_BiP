// application/outbound/PaymentEventStream.ts

import { eventBus } from "../../../shared/config";
import { subscribeWithFilter } from "../../../shared/infrastructure/subscribeWithFilter";
import type { EventFilter } from "../../../shared/infrastructure/subscribeWithFilter";
import { Result } from "../../../shared/domain/Result";

export type IntegrationEvent = {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

const DOMAIN_TO_INTEGRATION = {
  "payment.order.completed": (event: any): IntegrationEvent => ({
    type: "payment.completed",
    payload: {
      saleId: event.payload.saleId,
    },
    occurredAt: event.occurredAt.toISOString(),
  }),

  "payment.order.failed": (event: any): IntegrationEvent => ({
    type: "payment.failed",
    payload: {
      saleId: event.payload.saleId,
    },
    occurredAt: event.occurredAt.toISOString(),
  }),

  "payment.transaction.result": (event: any): IntegrationEvent => ({
    type: "payment.transaction.result",
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
  }),
} as const;

const FILTERS = Object.keys(DOMAIN_TO_INTEGRATION).map(
  (eventName) =>
    ({
      eventName,
    }) as EventFilter
);

export function subscribeToPaymentEvents(
  onEvent: (event: IntegrationEvent) => void
) {
  return subscribeWithFilter(eventBus, FILTERS, {
    handle: async (event) => {
      const mapper =
        DOMAIN_TO_INTEGRATION[
          event.eventName as keyof typeof DOMAIN_TO_INTEGRATION
        ];

      if (!mapper) return Result.ok(undefined);

      const integrationEvent = mapper(event);
      onEvent(integrationEvent);
      return Result.ok(undefined);
    },
  });
}
