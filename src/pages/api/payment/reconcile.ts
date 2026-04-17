import type { APIRoute } from "astro";
import { reconcilePayment } from "../../../../package/core/payment";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.paymentId !== "string" ||
    typeof body.transactionId !== "string"
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Invalid payload. Required: { paymentId: string, transactionId: string }",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await reconcilePayment.execute(
    body.paymentId,
    body.transactionId
  );

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()!.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ status: result.getValue() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
