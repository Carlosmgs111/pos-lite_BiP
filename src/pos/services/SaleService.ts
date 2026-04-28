import {
  $cartItems,
  $cartStatus,
  $saleId,
  addToCart,
  removeFromCart,
  clearCart,
  $getItemQuantity,
  updateItemQuantity,
} from "../stores/cart";
import { $totalToPay, $paymentStatus, resetPayment } from "../stores/payment";
import { CatalogService } from "./CatalogService";
import { showToast } from "../stores/toast";

export const SaleService = {
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

    const res = await fetch("/api/sales/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, itemId: product.id, quantity: 1 }),
    });

    if (res.ok) {
      addToCart(product);
      await CatalogService.refreshProductStock(product.id);
    } else {
      showToast("No se pudo agregar el producto", "error");
    }
  },

  async removeProduct(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const res = await fetch("/api/sales/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId,
        itemId: productId,
        quantity: $getItemQuantity(productId),
      }),
    });

    if (res.ok) {
      removeFromCart(productId);
      await CatalogService.refreshProductStock(productId);
    } else {
      showToast("No se pudo remover el producto", "error");
    }
  },

  async decrementProductQuantity(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const res = await fetch("/api/sales/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, itemId: productId, quantity: 1 }),
    });

    if (res.ok) {
      const newQuantity = $getItemQuantity(productId) - 1;
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        updateItemQuantity(productId, newQuantity);
      }
      await CatalogService.refreshProductStock(productId);
    } else {
      showToast("No se pudo reducir la cantidad", "error");
    }
  },

  async incrementProductQuantity(productId: string) {
    const saleId = $saleId.get();
    if (!saleId) return;

    const res = await fetch("/api/sales/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, itemId: productId, quantity: 1 }),
    });

    if (res.ok) {
      updateItemQuantity(productId, $getItemQuantity(productId) + 1);
      await CatalogService.refreshProductStock(productId);
    } else {
      showToast("No se pudo incrementar la cantidad", "error");
    }
  },

  async confirmSale() {
    const saleId = $saleId.get();
    if (!saleId) return;

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
    const items = $cartItems.get();
    for (const item of items) {
      await CatalogService.refreshProductStock(item.productId);
    }
    clearCart();
    resetPayment();
  },

  startNewTransaction() {
    clearCart();
    resetPayment();
  },
};
