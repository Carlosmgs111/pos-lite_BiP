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
import { $catalog, adjustProductStock } from "../stores/catalog";
import { CatalogService } from "./CatalogService";
import { showToast } from "../stores/toast";

const DEBOUNCE_MS = 300;

const pendingMap = new Map<string, number>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function captureCartSnapshot(): string {
  return JSON.stringify($cartItems.get());
}

function restoreCartSnapshot(snapshot: string | null) {
  if (!snapshot) return;
  try { $cartItems.set(JSON.parse(snapshot)); } catch { /* ignore */ }
}

function scheduleFlush() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => flushPendingChanges(), DEBOUNCE_MS);
}

async function flushPendingChanges() {
  if (pendingMap.size === 0) return;
  const saleId = $saleId.get();
  if (!saleId) { pendingMap.clear(); return; }

  const snapshot = new Map(pendingMap);
  pendingMap.clear();
  const cartSnapshot = captureCartSnapshot();

  const results = await Promise.all(
    [...snapshot.entries()].map(([productId, qty]) =>
      fetch("/api/sales/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, itemId: productId, quantity: qty }),
      }).then(async (res) => ({ productId, ok: res.ok, error: res.ok ? null : await res.json().catch(() => ({ error: "Error del servidor" })) }))
    )
  );

  const failed = results.find((r) => !r.ok);
  if (failed) {
    restoreCartSnapshot(cartSnapshot);
    showToast(failed.error?.error ?? "Error al sincronizar", "error");
    return;
  }

  for (const r of results) {
    await CatalogService.refreshProductStock(r.productId);
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

    for (const item of $cartItems.get()) {
      adjustProductStock(item.productId, item.quantity);
    }

    const res = await fetch("/api/sales/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId }) });
    if (!res.ok) { showToast("No se pudo cancelar la venta", "error"); return; }

    showToast("Venta cancelada", "info");
    clearCart();
    resetPayment();
  },

  startNewTransaction() {
    if (syncTimer) clearTimeout(syncTimer);
    pendingMap.clear();
    clearCart();
    resetPayment();
  },
};
