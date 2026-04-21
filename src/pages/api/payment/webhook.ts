import type { APIRoute } from "astro";
import { webhookHandler } from "../../../../package/core/payment";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  console.log("Webhook received");
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.paymentId !== "string" ||
    typeof body.success !== "boolean" ||
    typeof body.transaction_id !== "string"
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Invalid payload. Required: { paymentId: string, success: boolean, transaction_id: string }",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  await webhookHandler.handle({
    provider: "mockProvider",
    payload: {
      transactionId: body.transaction_id,
      success: body.success,
    },
  });

  return new Response(
    JSON.stringify({ confirmed: true, paymentId: body.paymentId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
