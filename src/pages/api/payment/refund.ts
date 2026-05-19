import type { APIRoute } from "astro";
import { refundPayment } from "../../../../package/core";

export const prerender = false;

// 🛠️ FASE 18: API Endpoints — Nuevo endpoint POST /api/payment/refund
// ! [ANTES] No existía endpoint para solicitar refunds individuales
// ? [DESPUÉS] POST /api/payment/refund crea un refund PENDING con protección contra double-refund

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.paymentId !== "string") {
    return new Response(
      JSON.stringify({ error: "paymentId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await refundPayment.execute(body.paymentId);
  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError().message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, paymentId: body.paymentId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
