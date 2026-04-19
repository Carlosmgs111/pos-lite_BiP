import type { APIRoute } from "astro";
import { createSale } from "../../../../package/core";
import { UuidVO } from "../../../../package/core/shared/domain/Uuid.VO";

export const prerender = false;

export const POST: APIRoute = async () => {
  const saleId = UuidVO.generate();

  const result = await createSale.execute({
    id: saleId,
    itemIds: [],
    createdAt: new Date(),
  });

  if (!result.isSuccess) {
    return new Response(
      JSON.stringify({ error: result.getError()?.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ saleId }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
};
