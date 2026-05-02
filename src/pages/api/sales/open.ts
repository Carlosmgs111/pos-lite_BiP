import type { APIRoute } from "astro";
import { saleRepository } from "../../../../package/core/sales";

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await saleRepository.findOpenSale();

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const sale = result.getValue();

  if (!sale) {
    return new Response(JSON.stringify({ sale: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      sale: {
        id: sale.getId().getValue(),
        items: sale.getItems().map((i) => i.serialize()),
        total: sale.getTotal().getValue(),
        status: sale.getStatus(),
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
