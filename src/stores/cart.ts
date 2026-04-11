import { atom } from "nanostores";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type CartStatus = "idle" | "active" | "confirmed" | "cancelled";

export const $cartItems = atom<CartItem[]>([]);
export const $cartStatus = atom<CartStatus>("idle");
export const $saleId = atom<string | null>(null);

export function addToCart(product: {
  id: string;
  name: string;
  price: number;
}) {
  const items = $cartItems.get();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    $cartItems.set(
      items.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  } else {
    $cartItems.set([
      ...items,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      },
    ]);
  }
}

export const $getItemQuantity = (productId: string) => {
  const item = $cartItems.get().find((i) => i.productId === productId);
  return item ? item.quantity : 0;
};

export function removeFromCart(productId: string) {
  $cartItems.set($cartItems.get().filter((i) => i.productId !== productId));
}

export function updateItemQuantity(productId: string, quantity: number) {
  $cartItems.set(
    $cartItems.get().map((i) =>
      i.productId === productId ? { ...i, quantity } : i
    )
  );
}

export function clearCart() {
  $cartItems.set([]);
  $cartStatus.set("idle");
  $saleId.set(null);
}

export function getCartTotal(): number {
  return $cartItems.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
}
