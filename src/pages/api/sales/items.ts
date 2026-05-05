import type { APIRoute } from "astro";
import { setItemQuantity, productRepository } from "../../../../package/core";

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

  const stockResult = await productRepository.getProducts([body.itemId]);
  const stock = stockResult.isSuccess ? stockResult.getValue()?.[0]?.getStock() ?? 0 : 0;

  return new Response(
    JSON.stringify({ ok: true, stock }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
