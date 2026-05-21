import type { APIRoute } from "astro";
import { reconcilePaymentOrder } from "../../../../../../package/core/payment";

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id)
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  const result = await reconcilePaymentOrder.execute(id);
  console.log(result);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
