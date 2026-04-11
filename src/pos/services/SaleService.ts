import {
  createSale,
  addItemToSale,
  registerSale,
  cancelSale,
} from "../../../package/core";
import {
  saleRepository,
  removeItemFromSale,
} from "../../../package/core/sales";
import { UuidVO } from "../../../package/core/shared/domain/Uuid.VO";
import {
  $cartItems,
  $cartStatus,
  $saleId,
  addToCart,
  removeFromCart,
  clearCart,
  $getItemQuantity,
  updateItemQuantity,
} from "../../stores/cart";   
import {
  $totalToPay,
  $paymentStatus,
  resetPayment,
} from "../../stores/payment";
import { CatalogService } from "./CatalogService";
import { showToast } from "../../stores/toast";

CatalogService.init();

export const SaleService = {
  async startSale() {
    const saleId = UuidVO.generate();
    await createSale.execute({
      id: saleId,
      itemIds: [],
      createdAt: new Date(),
    });
    $saleId.set(saleId);
    $cartStatus.set("active");
    return saleId;
  },

  async addProduct(product: { id: string; name: string; price: number }) {
    let saleId = $saleId.get();
    if (!saleId) {
      saleId = await this.startSale();
    }

    const result = await addItemToSale.execute({
      saleId,
      itemId: product.id,
      quantity: 1,
    });

    if (result.isSuccess) {
      addToCart(product);
      await CatalogService.refreshProductStock(product.id);
    } else {
      showToast("No se pudo agregar el producto", "error");
    }

    return result;
  },

  async removeProduct(productId: string) {
    const result = await removeItemFromSale.execute({
      saleId: $saleId.get()!,
      itemId: productId,
      quantity: $getItemQuantity(productId),
    });
    if (!result.isSuccess) {
      showToast("No se pudo remover el producto", "error");
      return result;
    }
    removeFromCart(productId);
    await CatalogService.refreshProductStock(productId);
    return result;
  },

  async decrementProductQuantity(productId: string) {
    const result = await removeItemFromSale.execute({
      saleId: $saleId.get()!,
      itemId: productId,
      quantity: 1,
    });
    if (!result.isSuccess) {
      showToast("No se pudo reducir la cantidad", "error");
      return result;
    }
    const newQuantity = $getItemQuantity(productId) - 1;
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateItemQuantity(productId, newQuantity);
    }
    await CatalogService.refreshProductStock(productId);
    return result;
  },

  async incrementProductQuantity(productId: string) {
    const result = await addItemToSale.execute({
      saleId: $saleId.get()!,
      itemId: productId,
      quantity: 1,
    });
    if (!result.isSuccess) {
      showToast("No se pudo incrementar la cantidad", "error");
      return result;
    }
    updateItemQuantity(productId, $getItemQuantity(productId) + 1);
    await CatalogService.refreshProductStock(productId);
    return result;
  },

  async confirmSale() {
    const saleId = $saleId.get();
    if (!saleId) return;

    const result = await registerSale.execute(saleId);
    if (!result.isSuccess) {
      showToast("No se pudo confirmar la venta", "error");
      return result;
    }
    showToast("Venta confirmada", "success");

    $cartStatus.set("confirmed");

    const sale = (await saleRepository.getSaleById(saleId)).getValue();
    if (sale) {
      $totalToPay.set(sale.getTotal().getValue());
      $paymentStatus.set("awaiting_payment");
    }

    return result;
  },

  async cancelCurrentSale() {
    const saleId = $saleId.get();
    if (!saleId) return;

    const result = await cancelSale.execute(saleId);
    if (!result.isSuccess) {
      showToast("No se pudo cancelar la venta", "error");
      return result;
    }
    showToast("Venta cancelada", "info");
    if (result.isSuccess) {
      const items = $cartItems.get();
      for (const item of items) {
        await CatalogService.refreshProductStock(item.productId);
      }
      clearCart();
      resetPayment();
    }

    return result;
  },

  startNewTransaction() {
    clearCart();
    resetPayment();
  },
};
