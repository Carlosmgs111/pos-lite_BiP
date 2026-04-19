import type { APIRoute } from "astro";
import { getProducts } from "../../../../package/core";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return new Response(
      JSON.stringify({ error: "Required query param: productId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await getProducts.execute([productId]);
  if (!result.isSuccess || !result.getValue()?.length) {
    return new Response(
      JSON.stringify({ error: "Product not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const product = result.getValue()![0];

  return new Response(
    JSON.stringify({ productId, stock: product.getStock() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
