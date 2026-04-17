import type { APIRoute } from "astro";
import { eventBus } from "../../../../package/core/shared/config";
import {
  subscribeWithFilter,
  type EventFilter,
} from "../../../../package/core/shared/infrastructure/subscribeWithFilter";

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
  const url = new URL(request.url);
  const saleId = url.searchParams.get("saleId");

  if (!saleId) {
    return new Response(
      JSON.stringify({ error: "Required query param: saleId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const filters: EventFilter[] = PAYMENT_EVENTS.map((eventName) => ({
    eventName,
    where: (event) => event.payload.saleId === saleId,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeWithFilter(eventBus, filters, {
        handle: async (event) => {
          const publicEvent = {
            type: eventTranslator[event.eventName] ?? event.eventName,
            data: event.payload,
            timestamp: event.occurredAt.toISOString(),
          };
          const chunk = `data: ${JSON.stringify(publicEvent)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        },
      });

      // * Keep the connection alive to prevent the client from timing out each 30 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 30_000);

      // * Close the connection when the client disconnects
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(keepAlive);
        controller.close();
      });
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
