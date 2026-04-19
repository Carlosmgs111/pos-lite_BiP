import type { APIRoute } from "astro";
import { cancelSale } from "../../../../package/core";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId) {
    return new Response(
      JSON.stringify({ error: "Required: saleId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await cancelSale.execute(body.saleId);

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
