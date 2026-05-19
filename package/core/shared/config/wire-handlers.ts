import { eventBus } from "./index";
import { PaymentOrderCompleted } from "../../payment/domain/events/PaymentOrderCompleted";
import { PaymentOrderFailed } from "../../payment/domain/events/PaymentOrderFailed";
import { SalesReadyToPay } from "../../sales/domain/events/SalesReadyToPay";
import { RefundRequested } from "../../payment/domain/events/RefundRequested";
import { RefundCompleted } from "../../payment/domain/events/RefundCompleted";
import { SaleCompletedOnPayment } from "../../sales/application/event-handlers/SaleCompletedOnPayment";
import { SaleFailedOnPayment } from "../../sales/application/event-handlers/SaleFailedOnPayment";
import { SaleRefundRequestedOnPayment } from "../../sales/application/event-handlers/SaleRefundRequestedOnPayment";
import { SaleRefundCompletedOnPayment } from "../../sales/application/event-handlers/SaleRefundCompletedOnPayment";
import { CreatePaymentOrderOnSaleReady } from "../../payment/application/event-handlers/CreatePaymentOrderOnSaleReady";
import { CompleteSale } from "../../sales/application/use-cases/CompleteSale";
import { FailSale } from "../../sales/application/use-cases/FailSale";
import { CreatePaymentOrder } from "../../payment/application/use-cases/CreatePaymentOrder";
import { saleRepository } from "../../sales";
import { paymentOrderRepository } from "../../payment";
import { handleStockForSale } from "../../inventory";
import { HandleStock } from "../../sales/infrastructure/HandleStock";

let wired = false;

export function wireHandlers(): void {
  if (wired) return;
  wired = true;

  const handleStock = new HandleStock(handleStockForSale);
  const completeSale = new CompleteSale(saleRepository);
  const failSale = new FailSale(saleRepository, handleStock);
  const createPaymentOrder = new CreatePaymentOrder(paymentOrderRepository);

  eventBus.subscribe(
    PaymentOrderCompleted.eventName,
    new SaleCompletedOnPayment(completeSale)
  );
  eventBus.subscribe(
    PaymentOrderFailed.eventName,
    new SaleFailedOnPayment(failSale)
  );
  eventBus.subscribe(
    SalesReadyToPay.eventName,
    new CreatePaymentOrderOnSaleReady(createPaymentOrder)
  );
  eventBus.subscribe(
    RefundRequested.eventName,
    new SaleRefundRequestedOnPayment()
  );
  eventBus.subscribe(
    RefundCompleted.eventName,
    new SaleRefundCompletedOnPayment(failSale)
  );
}
