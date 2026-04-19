import type { APIRoute } from "astro";
import { registerSale } from "../../../../package/core";
import { saleRepository } from "../../../../package/core/sales";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId) {
    return new Response(
      JSON.stringify({ error: "Required: saleId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await registerSale.execute(body.saleId);

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const sale = (await saleRepository.getSaleById(body.saleId)).getValue();

  return new Response(
    JSON.stringify({
      ok: true,
      totalAmount: sale?.getTotal().getValue() ?? 0,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
