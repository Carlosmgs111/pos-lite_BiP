import { useStore } from "@nanostores/preact";
import { useState, useEffect } from "preact/hooks";
import { $cartItems, $cartStatus } from "../stores/cart";
import { $paymentStatus } from "../stores/payment";
import { SaleService } from "../services/SaleService";
import { CatalogService } from "../services/CatalogService";
import ProductSelector from "./ProductSelector";
import CartReview from "./CartReview";
import SaleSummary from "./SaleSummary";
import CheckoutPayment from "./CheckoutPayment";
import StepIndicator from "./StepIndicator";

type SaleStep = "products" | "cart" | "summary" | "payment" | "completed";

export default function SaleManager() {
  const cartItems = useStore($cartItems);
  const cartStatus = useStore($cartStatus);
  const paymentStatus = useStore($paymentStatus);

  useEffect(() => {
    CatalogService.init();
  }, []);

  const getCurrentStep = (): SaleStep => {
    if (paymentStatus === "completed" || paymentStatus === "failed") return "completed";
    if (paymentStatus === "awaiting_payment" || paymentStatus === "partial" || paymentStatus === "processing") return "payment";
    if (cartStatus === "confirmed") return "summary";
    if (cartItems.length > 0) return "cart";
    return "products";
  };

  const currentStep = getCurrentStep();

  const stepNumber = (): number => {
    switch (currentStep) {
      case "products": return 1;
      case "cart": return 2;
      case "summary": return 3;
      case "payment": return 4;
      case "completed": return 4;
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case "products":
        return (
          <div class="h-full">
            <ProductSelector />
          </div>
        );
      case "cart":
        return (
          <CartReview
            onNext={() => SaleService.confirmSale()}
            onBack={() => {}}
          />
        );
      case "summary":
        return (
          <SaleSummary
            onConfirm={() => {}}
            onBack={() => {}}
            onCancel={() => SaleService.cancelCurrentSale()}
          />
        );
      case "payment":
        return <CheckoutPayment />;
      case "completed":
        return <CheckoutPayment />;
    }
  };

  return (
    <div class="space-y-6">
      <StepIndicator currentStep={stepNumber()} itemCount={cartItems.length} />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl border border-gray-200 p-5 min-h-[500px]">
            {renderContent()}
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
            <h3 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">
              Resumen de venta
            </h3>

            {cartItems.length === 0 ? (
              <p class="text-sm text-gray-400 text-center py-8">
                Agrega productos para comenzar
              </p>
            ) : (
              <>
                <div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.productId} class="flex justify-between text-sm">
                      <span class="text-gray-600 truncate flex-1">
                        {item.name} x{item.quantity}
                      </span>
                      <span class="font-mono font-medium text-gray-900 ml-2">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div class="border-t border-gray-200 pt-3">
                  <div class="flex justify-between items-baseline">
                    <span class="text-sm font-medium text-gray-500">Total</span>
                    <span class="text-xl font-mono font-bold text-gray-900">
                      ${cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-100">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">Estado</span>
                    <span
                      class={`px-2 py-1 rounded-full font-medium ${
                        cartStatus === "active"
                          ? "bg-blue-50 text-blue-700"
                          : cartStatus === "confirmed"
                          ? "bg-emerald-50 text-emerald-700"
                          : cartStatus === "cancelled"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {cartStatus === "active"
                        ? "En curso"
                        : cartStatus === "confirmed"
                        ? "Confirmada"
                        : cartStatus === "cancelled"
                        ? "Cancelada"
                        : "Inactiva"}
                    </span>
                  </div>
                </div>

                {cartStatus === "active" && cartItems.length > 0 && (
                  <button
                    onClick={() => SaleService.cancelCurrentSale()}
                    class="w-full mt-4 py-2 px-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Cancelar venta
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
