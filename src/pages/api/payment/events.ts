import type { APIRoute } from "astro";
import { eventBus } from "../../../../package/core/shared/config";
import {
  subscribeWithFilter,
  type EventFilter,
} from "../../../../package/core/shared/infrastructure/subscribeWithFilter";
import { SSEStreamAdapter } from "../../../../package/core/shared/infrastructure/SSEStreamAdapter";

export const prerender = false;

const PAYMENT_EVENTS = [
  "payment.order.completed",
  "payment.order.failed",
] as const;

const eventTranslator: Record<string, string> = {
  "payment.order.completed": "payment.completed",
  "payment.order.failed": "payment.failed",
};

export const GET: APIRoute = async ({ request }) => {
  const filters: EventFilter[] = PAYMENT_EVENTS.map((eventName) => ({
    eventName,
  }));

  let sse: SSEStreamAdapter | null = null;

  const stream = new ReadableStream({
    start(controller) {
      sse = new SSEStreamAdapter(controller);

      const unsubscribe = subscribeWithFilter(eventBus, filters, {
        handle: async (event) => {
          const type = eventTranslator[event.eventName] ?? event.eventName;
          sse?.sendEvent(type, {
            ...event.payload,
            timestamp: event.occurredAt.toISOString(),
          });
        },
      });

      sse.onClose(unsubscribe);
      request.signal.addEventListener("abort", () => sse?.close());
    },

    cancel() {
      sse?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
