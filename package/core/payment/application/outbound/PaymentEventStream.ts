// ? 💡application/outbound/PaymentEventStream.ts
// ? Mecanismo de integración de eventos con la infraestructura
import { eventBus } from "../../../shared/config";
import { subscribeWithFilter, type EventFilter } from "../../../shared/infrastructure/subscribeWithFilter";
import { Result } from "../../../shared/domain/Result";
import { PaymentEventType } from "../../../../contracts/payment/PaymentEventTypes";

export type IntegrationEvent = {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

const DOMAIN_TO_INTEGRATION = {
  [PaymentEventType.ORDER_COMPLETED]: (event: any): IntegrationEvent => ({
    type: PaymentEventType.ORDER_COMPLETED,
    payload: {
      saleId: event.payload.saleId,
    },
    occurredAt: event.occurredAt.toISOString(),
  }),

  [PaymentEventType.ORDER_FAILED]: (event: any): IntegrationEvent => ({
    type: PaymentEventType.ORDER_FAILED,
    payload: {
      saleId: event.payload.saleId,
    },
    occurredAt: event.occurredAt.toISOString(),
  }),

  [PaymentEventType.TRANSACTION_RESULT]: (event: any): IntegrationEvent => ({
    type: PaymentEventType.TRANSACTION_RESULT,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
  }),
} as const;

const FILTERS = Object.values(PaymentEventType).map(
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
          event.eventName as PaymentEventType
        ];

      if (!mapper) return Result.ok(undefined);

      const integrationEvent = mapper(event);
      onEvent(integrationEvent);
      return Result.ok(undefined);
    },
  });
}
