import type { APIRoute } from "astro";
import { SSEStreamAdapter } from "../../../../package/core/shared/infrastructure/SSEStreamAdapter";
import { subscribeToPaymentEvents } from "../../../../package/core/payment/application/outbound/PaymentEventStream";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {

  let sse: SSEStreamAdapter | null = null;

  const stream = new ReadableStream({
    start(controller) {
      sse = new SSEStreamAdapter(controller);

      const unsubscribe = subscribeToPaymentEvents((event) => {
        sse?.sendEvent(event.type, {
          ...event.payload,
          timestamp: event.occurredAt,
        });
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
