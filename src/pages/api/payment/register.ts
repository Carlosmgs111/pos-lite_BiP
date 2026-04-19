import type { APIRoute } from "astro";
import { addPayment } from "../../../../package/core/payment";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId || !body.paymentId || !body.method || !body.amount) {
    return new Response(
      JSON.stringify({ error: "Required: saleId, paymentId, method, amount" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await addPayment.execute(body.saleId, {
    id: body.paymentId,
    method: body.method,
    amount: body.amount,
  });

  if (!result.isSuccess) {
    console.log("[POST /api/payment/register] Payment registration failed", result.getError());
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, paymentId: body.paymentId }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
};
