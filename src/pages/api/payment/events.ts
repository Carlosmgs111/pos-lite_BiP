import type { APIRoute } from "astro";
import { SSEStreamAdapter } from "../../../../package/core/shared/infrastructure/SSEStreamAdapter";
import { subscribeWithFilter, type EventFilter } from "../../../../package/core/shared/infrastructure/subscribeWithFilter";
import { eventBus } from "../../../../package/core/shared/config";
import { Result } from "../../../../package/core/shared/domain/Result";

export const prerender = false;

const FILTERS: EventFilter[] = [
  { eventName: "payment.order.completed" },
  { eventName: "payment.order.failed" },
  { eventName: "payment.refund.requested" },
  { eventName: "payment.refund.completed" },
  { eventName: "payment.transaction.result" },
];

export const GET: APIRoute = async ({ request }) => {
  let sse: SSEStreamAdapter | null = null;
  try {
    // ? 💡Integración de eventos con la infraestructura

    const stream = new ReadableStream({
      start(controller) {
        sse = new SSEStreamAdapter(controller);

        const unsubscribe = subscribeWithFilter(
          eventBus,
          FILTERS,
          {
            handle: async (event) => {
              sse?.sendEvent(event.eventName, {
                ...event.payload,
                timestamp: event.occurredAt,
              });
              return Result.ok(undefined);
            },
          }
        );

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
  } catch (e) {
    console.error(e);
    return new Response("Error al establecer la conexión", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
};
