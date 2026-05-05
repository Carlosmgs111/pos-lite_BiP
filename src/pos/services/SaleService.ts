import {
  $cartItems,
  $cartStatus,
  $saleId,
  addToCart,
  removeFromCart,
  clearCart,
  updateItemQuantity,
} from "../stores/cart";
import { $totalToPay, $paymentStatus, resetPayment } from "../stores/payment";
import { $catalog, adjustProductStock, updateProductStock } from "../stores/catalog";
import { showToast } from "../stores/toast";

const DEBOUNCE_MS = 300;

const pendingMap = new Map<string, number>();
const inflightMap = new Map<string, number>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let mutationId = 0;

function captureCartSnapshot(productId: string): string | null {
  const item = $cartItems.get().find((i) => i.productId === productId);
  return item ? JSON.stringify(item) : null;
}

function restoreCartItem(snapshot: string | null, productId: string) {
  if (!snapshot) { removeFromCart(productId); return; }
  try {
    const item = JSON.parse(snapshot);
    const existing = $cartItems.get().find((i) => i.productId === productId);
    if (existing) {
      updateItemQuantity(productId, item.quantity);
    } else {
      $cartItems.set([...$cartItems.get(), item]);
    }
  } catch { /* ignore */ }
}

function scheduleFlush() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => flushPendingChanges(), DEBOUNCE_MS);
}

async function flushPendingChanges() {
  if (pendingMap.size === 0) return;
  const saleId = $saleId.get();
  if (!saleId) { pendingMap.clear(); return; }

  // Move pending → inflight, snapshot each item's pre-sync state
  for (const [productId, qty] of pendingMap) {
    inflightMap.set(productId, qty);
  }
  pendingMap.clear();
  const currentMutation = ++mutationId;

  const snapshots = new Map<string, string | null>();
  for (const productId of inflightMap.keys()) {
    snapshots.set(productId, captureCartSnapshot(productId));
  }

  const results = await Promise.allSettled(
    [...inflightMap.entries()].map(async ([productId, qty]) => {
      const res = await fetch("/api/sales/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, itemId: productId, quantity: qty }),
      });
      const data = await res.json().catch(() => ({ error: "Error del servidor" }));
      if (!res.ok) throw { productId, error: data.error ?? "Error al sincronizar" };
      return { productId, stock: data.stock };
    })
  );

  // Ignore stale responses
  if (currentMutation !== mutationId) return;

  let hadError = false;

  for (const r of results) {
    if (r.status === "fulfilled") {
      const { productId, stock } = r.value;
      inflightMap.delete(productId);
      updateProductStock(productId, stock);
    } else {
      hadError = true;
      const { productId, error } = r.reason as { productId: string; error: string };
      inflightMap.delete(productId);
      restoreCartItem(snapshots.get(productId)!, productId);
      showToast(error, "error");
    }
  }

  if (hadError) {
    // Re-enqueue any remaining inflight items for retry
    for (const [productId, qty] of inflightMap) {
      pendingMap.set(productId, qty);
    }
    inflightMap.clear();
  }
}

export const SaleService = {
  async loadOpenSale() {
    const res = await fetch("/api/sales/open");
    if (!res.ok) return;

    const data = await res.json();
    if (!data.sale) return;

    const sale = data.sale;
    $saleId.set(sale.id);
    $cartStatus.set(sale.status === "READY_TO_PAY" ? "confirmed" : "active");

    if (sale.status === "READY_TO_PAY") {
      $totalToPay.set(sale.total);
      $paymentStatus.set("awaiting_payment");
    }

    if (sale.items && sale.items.length > 0) {
      $cartItems.set(
        sale.items.map((i: any) => ({
          productId: i.productId,
          name: i.nameSnapshot,
          price: i.priceSnapshot,
          quantity: i.quantity,
        }))
      );
    }
  },

  async startSale() {
    const res = await fetch("/api/sales/create", { method: "POST" });
    if (!res.ok) { showToast("No se pudo crear la venta", "error"); return null; }
    const data = await res.json();
    $saleId.set(data.saleId);
    $cartStatus.set("active");
    return data.saleId as string;
  },

  async addProduct(product: { id: string; name: string; price: number }) {
    let saleId = $saleId.get();
    if (!saleId) { saleId = await this.startSale(); if (!saleId) return; }

    const stock = $catalog.get().find((p) => p.id === product.id);
    if (!stock || stock.stock <= 0) { showToast("Sin stock disponible", "error"); return; }

    addToCart(product);
    adjustProductStock(product.id, -1);
    pendingMap.set(product.id, ($cartItems.get().find((i) => i.productId === product.id)?.quantity ?? 1));
    scheduleFlush();
  },

  async incrementProductQuantity(productId: string) {
    if (!$saleId.get()) return;
    const stock = $catalog.get().find((p) => p.id === productId);
    const item = $cartItems.get().find((i) => i.productId === productId);
    if (!stock || !item) return;

    if (stock.stock <= 0) { showToast("Stock máximo alcanzado", "info"); return; }

    updateItemQuantity(productId, item.quantity + 1);
    adjustProductStock(productId, -1);
    pendingMap.set(productId, item.quantity + 1);
    scheduleFlush();
  },

  async decrementProductQuantity(productId: string) {
    if (!$saleId.get()) return;
    const item = $cartItems.get().find((i) => i.productId === productId);
    if (!item) return;

    const newQty = item.quantity - 1;
    if (newQty <= 0) {
      adjustProductStock(productId, item.quantity);
      removeFromCart(productId);
      pendingMap.set(productId, 0);
    } else {
      updateItemQuantity(productId, newQty);
      adjustProductStock(productId, 1);
      pendingMap.set(productId, newQty);
    }
    scheduleFlush();
  },

  async removeProduct(productId: string) {
    if (!$saleId.get()) return;
    const item = $cartItems.get().find((i) => i.productId === productId);
    if (!item) return;

    adjustProductStock(productId, item.quantity);
    removeFromCart(productId);
    pendingMap.set(productId, 0);
    scheduleFlush();
  },

  async confirmSale() {
    const saleId = $saleId.get();
    if (!saleId) return;

    await flushPendingChanges();

    const res = await fetch("/api/sales/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    });

    if (!res.ok) { showToast("No se pudo confirmar la venta", "error"); return; }

    const data = await res.json();
    showToast("Venta confirmada", "success");
    $cartStatus.set("confirmed");
    $totalToPay.set(data.totalAmount);
    $paymentStatus.set("awaiting_payment");
  },

  async cancelCurrentSale() {
    const saleId = $saleId.get();
    if (!saleId) return;

    if (syncTimer) clearTimeout(syncTimer);
    pendingMap.clear();
    inflightMap.clear();

    for (const item of $cartItems.get()) {
      adjustProductStock(item.productId, item.quantity);
    }

    const res = await fetch("/api/sales/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    });
    if (!res.ok) { showToast("No se pudo cancelar la venta", "error"); return; }

    showToast("Venta cancelada", "info");
    clearCart();
    resetPayment();
  },

  startNewTransaction() {
    if (syncTimer) clearTimeout(syncTimer);
    pendingMap.clear();
    inflightMap.clear();
    clearCart();
    resetPayment();
  },
};
