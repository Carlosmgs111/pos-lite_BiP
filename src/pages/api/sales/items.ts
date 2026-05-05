import type { APIRoute } from "astro";
import { setItemQuantity } from "../../../../package/core";

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId || !body.itemId || body.quantity == null) {
    return new Response(
      JSON.stringify({ error: "Required: saleId, itemId, quantity" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await setItemQuantity.execute({
    saleId: body.saleId,
    itemId: body.itemId,
    quantity: body.quantity,
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const sale = result.getValue()!;
  return new Response(
    JSON.stringify({
      ok: true,
      items: sale.getItems().map((i) => i.serialize()),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
