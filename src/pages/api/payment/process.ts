import type { APIRoute } from "astro";
import { processPayment } from "../../../../package/core";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.paymentId || !body.method || !body.amount) {
    return new Response(
      JSON.stringify({ error: "Required: paymentId, method, amount" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await processPayment.execute(body.paymentId, {
    paymentId: body.paymentId,
    amount: body.amount,
    method: body.method,
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, transactionId: result.getValue() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
