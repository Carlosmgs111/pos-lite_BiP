import type { APIRoute } from "astro";
import { completeRefund } from "../../../../package/core";
import { PaymentSettlementSource } from "../../../../package/core/payment/domain/Payment";

export const prerender = false;

// 🛠️ FASE 18: API Endpoints — Nuevo endpoint POST /api/payment/complete-refund
// ! [ANTES] Los refunds se auto-completaban sin confirmación operativa
// ? [DESPUÉS] POST /api/payment/complete-refund requiere confirmación explícita con settlementSource

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.refundPaymentId !== "string" ||
    typeof body.settlementSource !== "string"
  ) {
    return new Response(
      JSON.stringify({
        error: "refundPaymentId and settlementSource are required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validSources = Object.values(PaymentSettlementSource);
  if (!validSources.includes(body.settlementSource)) {
    return new Response(
      JSON.stringify({
        error: `Invalid settlementSource. Valid values: ${validSources.join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await completeRefund.execute({
    refundPaymentId: body.refundPaymentId,
    settlementSource: body.settlementSource as PaymentSettlementSource,
    externalReference: body.externalReference,
    notes: body.notes,
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError().message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, refundPaymentId: body.refundPaymentId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
