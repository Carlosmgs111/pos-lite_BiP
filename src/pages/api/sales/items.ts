import type { APIRoute } from "astro";
import { addItemToSale } from "../../../../package/core";
import { removeItemFromSale } from "../../../../package/core/sales";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId || !body.itemId) {
    return new Response(
      JSON.stringify({ error: "Required: saleId, itemId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await addItemToSale.execute({
    saleId: body.saleId,
    itemId: body.itemId,
    quantity: body.quantity ?? 1,
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError() }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || !body.saleId || !body.itemId) {
    return new Response(
      JSON.stringify({ error: "Required: saleId, itemId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await removeItemFromSale.execute({
    saleId: body.saleId,
    itemId: body.itemId,
    quantity: body.quantity ?? 1,
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError() }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
