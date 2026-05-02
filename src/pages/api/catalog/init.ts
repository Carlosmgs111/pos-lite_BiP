import type { APIRoute } from "astro";
import { registerProduct, productRepository } from "../../../../package/core";
import { UuidVO } from "../../../../package/core/shared/domain/Uuid.VO";
import type { Product } from "../../../../package/core/inventory/domain/Product";
import { DEMO_PRODUCTS } from "../../../data/demo-products";

export const prerender = false;

export const POST: APIRoute = async () => {
  const existing = await productRepository.listProducts();

  if (existing.isSuccess && existing.getValue()!.length > 0) {
    const products = existing.getValue()!.map((p: Product) => ({
      id: p.getId().getValue(),
      name: p.getName(),
      price: p.getPrice(),
      stock: p.getStock(),
    }));
    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const products = [];

  for (const p of DEMO_PRODUCTS) {
    const id = UuidVO.generate();
    await registerProduct.execute({
      id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      reservedStock: 0,
    });
    products.push({ id, name: p.name, price: p.price, stock: p.stock });
  }

  return new Response(JSON.stringify({ products }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
