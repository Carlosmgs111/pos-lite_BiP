import type { APIRoute } from "astro";
import {
  paymentOrderRepository,
  paymentRepository,
} from "../../../../package/core/payment";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const saleId = url.searchParams.get("saleId");

  if (!saleId) {
    return new Response(
      JSON.stringify({ error: "Required query param: saleId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const orderResult = await paymentOrderRepository.findBySaleId(saleId);
  if (!orderResult.isSuccess || !orderResult.getValue()) {
    return new Response(
      JSON.stringify({ error: "Payment order not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const po = orderResult.getValue()!;

  const paymentsResult = await paymentRepository.findByPaymentOrderId(
    po.getId().getValue()
  );
  const payments = paymentsResult.isSuccess
    ? paymentsResult.getValue()!
    : [];

  return new Response(
    JSON.stringify({
      status: po.getStatus(),
      change: po.getChange().getValue(),
      payments: payments.map((p) => ({
        id: p.getId().getValue(),
        method: p.getMethod(),
        amount: p.getAmount().getValue(),
        status: p.getStatus(),
      })),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
