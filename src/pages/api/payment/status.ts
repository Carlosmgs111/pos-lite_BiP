import type { APIRoute } from "astro";
import { getPaymentOrderStatus } from "../../../../package/core";

export const prerender = false;

// 🛠️ FASE 18: API Endpoints — status.ts con proyección completa
// ! [ANTES] Accedía directamente a los repos sin usar projection; no retornaba snapshot financiero
// ? [DESPUÉS] Usa GetPaymentOrderStatus y retorna order + snapshot + payments completos

export const GET: APIRoute = async ({ url }) => {
  const saleId = url.searchParams.get("saleId");
  if (!saleId) {
    return new Response(
      JSON.stringify({ error: "saleId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await getPaymentOrderStatus.execute(saleId);
  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError().message }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { order, snapshot, payments } = result.getValue();

  return new Response(
    JSON.stringify({
      order: {
        id: order.getId().getValue(),
        saleId: order.getSaleId().getValue(),
        totalAmount: order.getTotalAmount().getValue(),
        status: order.getStatus(),
        createdAt: order.getCreatedAt(),
        completedAt: order.getCompletedAt(),
      },
      snapshot: {
        paidAmount: snapshot.paidAmount.getValue(),
        pendingAmount: snapshot.pendingAmount.getValue(),
        refundedAmount: snapshot.refundedAmount.getValue(),
        pendingRefundAmount: snapshot.pendingRefundAmount.getValue(),
        effectivePaid: snapshot.effectivePaid.getValue(),
        remainingAmount: snapshot.remainingAmount.getValue(),
        change: snapshot.change.getValue(),
        coverageState: snapshot.coverageState,
        hasPendingCharges: snapshot.hasPendingCharges,
        hasPendingRefunds: snapshot.hasPendingRefunds,
        hasCompletedCharges: snapshot.hasCompletedCharges,
        refundableAmount: snapshot.refundableAmount.getValue(),
      },
      payments: payments.map((p) => ({
        id: p.getId().getValue(),
        type: p.getType(),
        method: p.getMethod(),
        amount: p.getAmount().getValue(),
        status: p.getStatus(),
        settlementSource: p.getSettlementSource(),
        externalReference: p.getExternalReference(),
        notes: p.getNotes(),
        originalPaymentId: p.getOriginalPaymentId(),
        externalId: p.getExternalId(),
        createdAt: p.getCreatedAt(),
        completedAt: p.getCompletedAt(),
      })),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
