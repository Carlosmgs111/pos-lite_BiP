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

interface PendingChange {
  productId: string;
  delta: number;
}

let pending: PendingChange[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let previousCart: string | null = null;

function captureCartSnapshot(): string {
  return JSON.stringify($cartItems.get());
}

function restoreCartSnapshot(snapshot: string | null) {
  if (!snapshot) return;
  try {
    $cartItems.set(JSON.parse(snapshot));
  } catch {
    /* ignore */
  }
}

function scheduleFlush() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => flushPendingChanges(), DEBOUNCE_MS);
}

async function flushPendingChanges() {
  if (pending.length === 0) return;

  const saleId = $saleId.get();
  if (!saleId) {
    pending = [];
    return;
  }

  const batch = [...pending];
  pending = [];
  const snapshot = captureCartSnapshot();

  const merged = new Map<string, number>();
  for (const c of batch) {
    merged.set(c.productId, (merged.get(c.productId) || 0) + c.delta);
  }

  for (const [productId, netDelta] of merged) {
    if (netDelta === 0) continue;

    if (netDelta > 0) {
      const res = await fetch("/api/sales/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, itemId: productId, quantity: netDelta }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Error del servidor" }));
        handleSyncError(snapshot, batch, data.error ?? "Error al sincronizar");
        return;
      }
    } else {
      const res = await fetch("/api/sales/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, itemId: productId, quantity: Math.abs(netDelta) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Error del servidor" }));
        handleSyncError(snapshot, batch, data.error ?? "Error al sincronizar");
        return;
      }
    }

    await CatalogService.refreshProductStock(productId);
  }
}

function handleSyncError(
  snapshot: string | null,
  _batch: PendingChange[],
  error: string
) {
  restoreCartSnapshot(snapshot);
  showToast(error, "error");
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
    if (!res.ok) {
      showToast("No se pudo crear la venta", "error");
      return null;
    }

    const data = await res.json();
    $saleId.set(data.saleId);
    $cartStatus.set("active");
    return data.saleId as string;
  },

  async addProduct(product: { id: string; name: string; price: number }) {
    let saleId = $saleId.get();
    if (!saleId) {
      saleId = await this.startSale();
      if (!saleId) return;
    }

    const catalog = $catalog.get();
    const stock = catalog.find((p) => p.id === product.id);
    if (!stock || stock.stock <= 0) {
      showToast("Sin stock disponible", "error");
      return;
    }

    addToCart(product);
    adjustProductStock(product.id, -1);

    pending.push({ productId: product.id, delta: 1 });
    scheduleFlush();
  },

  async removeProduct(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const items = $cartItems.get();
    const item = items.find((i) => i.productId === productId);
    if (!item) return;

    adjustProductStock(productId, item.quantity);
    removeFromCart(productId);

    pending.push({ productId, delta: -item.quantity });
    scheduleFlush();
  },

  async decrementProductQuantity(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const items = $cartItems.get();
    const item = items.find((i) => i.productId === productId);
    if (!item) return;

    const newQty = item.quantity - 1;
    if (newQty <= 0) {
      adjustProductStock(productId, item.quantity);
      removeFromCart(productId);
      pending.push({ productId, delta: -item.quantity });
    } else {
      updateItemQuantity(productId, newQty);
      adjustProductStock(productId, 1);
      pending.push({ productId, delta: -1 });
    }
    scheduleFlush();
  },

  async incrementProductQuantity(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const catalog = $catalog.get();
    const stock = catalog.find((p) => p.id === productId);
    const items = $cartItems.get();
    const item = items.find((i) => i.productId === productId);
    if (!stock || !item) return;

    const pendingNow = pending
      .filter((p) => p.productId === productId)
      .reduce((sum, p) => sum + p.delta, 0);
    const projected = item.quantity + pendingNow + 1;

    if (stock.stock - projected < 0 && projected > item.quantity) {
      showToast("Stock máximo alcanzado", "info");
      return;
    }

    updateItemQuantity(productId, item.quantity + 1);
    adjustProductStock(productId, -1);

    pending.push({ productId, delta: 1 });
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

    if (!res.ok) {
      showToast("No se pudo confirmar la venta", "error");
      return;
    }

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
    pending = [];

    const items = $cartItems.get();
    for (const item of items) {
      adjustProductStock(item.productId, item.quantity);
    }

    const res = await fetch("/api/sales/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    });

    if (!res.ok) {
      showToast("No se pudo cancelar la venta", "error");
      return;
    }

    showToast("Venta cancelada", "info");
    clearCart();
    resetPayment();
  },

  startNewTransaction() {
    if (syncTimer) clearTimeout(syncTimer);
    pending = [];
    clearCart();
    resetPayment();
  },
};
