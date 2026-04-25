import type { Suite, TestResult } from "../runner";
import {
  registerProduct,
  createSale,
  addItemToSale,
  registerSale,
  getProducts,
} from "../../core";
import { saleRepository } from "../../core/sales";
import { productRepository } from "../../core/inventory";
import {
  paymentOrderRepository,
  addPayment,
  confirmPayment,
  cancelPaymentOrder,
  processPayment,
} from "../../core/payment";
import { PaymentMethod } from "../../core/payment";
import { PaymentOrderStatus } from "../../core/payment/domain/PaymentOrder";
import { SaleStatus } from "../../core/sales/domain/SaleStatus";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter4-payment-audit";
const suiteName = "Payment Audit (Iter 4)";
const suiteDescription =
  "Cancelacion, fallo por reintentos, guardas de estado terminal, validaciones";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

const productId = UuidVO.generate();
const cancelPendingSaleId = UuidVO.generate();
const cancelPartialSaleId = UuidVO.generate();
const failedRetriesSaleId = UuidVO.generate();
const terminalGuardSaleId = UuidVO.generate();
const zeroAmountSaleId = UuidVO.generate();

//--- Setup & Teardown

const setup = async () => {
  await registerProduct.execute({
    id: productId,
    name: "Audit Product",
    price: 100,
    stock: 50,
    reservedStock: 0,
  });
  // cancelPendingSaleId: for cancel from PENDING
  await createSale.execute({
    id: cancelPendingSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: cancelPendingSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(cancelPendingSaleId);
  // cancelPartialSaleId: for cancel from PARTIAL
  await createSale.execute({
    id: cancelPartialSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: cancelPartialSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(cancelPartialSaleId);
  // failedRetriesSaleId: for exhausted retries → FAILED
  await createSale.execute({
    id: failedRetriesSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: failedRetriesSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(failedRetriesSaleId);
  // terminalGuardSaleId: for terminal state guards
  await createSale.execute({
    id: terminalGuardSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: terminalGuardSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(terminalGuardSaleId);
  // zeroAmountSaleId: for zero amount validation
  await createSale.execute({
    id: zeroAmountSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: zeroAmountSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(zeroAmountSaleId);
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

//--- Cancel from PENDING

const cancelFromPending = async () => {
  const cancelResult = await cancelPaymentOrder.execute(cancelPendingSaleId);
  if (!cancelResult.isSuccess) {
    return result(cancelResult.getError() as unknown as string, false);
  }
  const po = (
    await paymentOrderRepository.findBySaleId(cancelPendingSaleId)
  ).getValue()!;
  return result(
    "Cancel payment order from PENDING transitions to CANCELLED",
    cancelResult.isSuccess && po.getStatus() === PaymentOrderStatus.CANCELLED
  );
};

//--- Cancel from PARTIAL

const cancelFromPartial = async () => {
  // Add a covering payment to make it PARTIAL
  await addPayment.execute({
    saleId: cancelPartialSaleId,
    paymentId: UuidVO.generate(),
    amount: 100,
    method: PaymentMethod.CARD,
  });
  const poBeforeResult =
    await paymentOrderRepository.findBySaleId(cancelPartialSaleId);
  if (!poBeforeResult.isSuccess) {
    return result(poBeforeResult.getError() as unknown as string, false);
  }
  const wasPartial =
    poBeforeResult.getValue()!.getStatus() === PaymentOrderStatus.PARTIAL;

  const cancelResult = await cancelPaymentOrder.execute(cancelPartialSaleId);
  const poAfter = (
    await paymentOrderRepository.findBySaleId(cancelPartialSaleId)
  ).getValue()!;
  return result(
    "Cancel payment order from PARTIAL transitions to CANCELLED",
    wasPartial &&
      cancelResult.isSuccess &&
      poAfter.getStatus() === PaymentOrderStatus.CANCELLED
  );
};

//--- Cannot add payment to cancelled order

const addPaymentToCancelledFails = async () => {
  const addResult = await addPayment.execute({
    saleId: cancelPendingSaleId,
    paymentId: UuidVO.generate(),
    amount: 50,
    method: PaymentMethod.CASH,
  });
  return result(
    "Cannot add payment to a CANCELLED order",
    !addResult.isSuccess
  );
};

//--- Failed retries → FAILED + Sale CANCELLED + stock restored

const exhaustedRetriesFailsOrder = async () => {
  // Add 3 covering payments and fail them all
  const p1 = UuidVO.generate();
  const p2 = UuidVO.generate();
  const p3 = UuidVO.generate();
  await addPayment.execute({
    saleId: failedRetriesSaleId,
    paymentId: p1,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute({
    paymentId: p1,
    success: false,
  });
  // After first fail, order reverts to PENDING — add new payment
  await addPayment.execute({
    saleId: failedRetriesSaleId,
    paymentId: p2,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute({
    paymentId: p2,
    success: false,
  });
  // After second fail, still PENDING — add third
  await addPayment.execute({
    saleId: failedRetriesSaleId,
    paymentId: p3,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute({
    paymentId: p3,
    success: false,
  });
  // Third fail triggers markAsFailed + PaymentOrderFailed event

  const po = (
    await paymentOrderRepository.findBySaleId(failedRetriesSaleId)
  ).getValue()!;
  return result(
    "3 failed payments transitions order to FAILED",
    po.getStatus() === PaymentOrderStatus.FAILED
  );
};

const failedOrderCancelsSale = async () => {
  const sale = (
    await saleRepository.getSaleById(failedRetriesSaleId)
  ).getValue()!;
  console.log(sale.getStatus());
  return result(
    "PaymentOrderFailed event cancels the Sale",
    sale.getStatus() === SaleStatus.CANCELLED
  );
};

const failedOrderRestoresStock = async () => {
  const stock = (await getProducts.execute([productId]))
    .getValue()![0]
    .getStock();
  // Initial=50, setup reserved 5 sales x 1 item → stock=45
  // failedRetriesSaleId's 1 item restored → stock=46
  return result(
    "Stock is restored after payment order fails definitively",
    stock === 46
  );
};

//--- Cannot add payment to FAILED order

const addPaymentToFailedFails = async () => {
  const addResult = await addPayment.execute({
    saleId: failedRetriesSaleId,
    paymentId: UuidVO.generate(),
    amount: 50,
    method: PaymentMethod.CASH,
  });
  return result("Cannot add payment to a FAILED order", !addResult.isSuccess);
};

//--- Cancel a COMPLETED order fails

const cancelCompletedFails = async () => {
  // Complete the terminalGuardSaleId order
  const paymentId = UuidVO.generate();
  await addPayment.execute({
    saleId: terminalGuardSaleId,
    paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  const processResult = await processPayment.execute(paymentId, {
    paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  if (!processResult.isSuccess) {
    return result(processResult.getError() as unknown as string, false);
  }
  // Try to cancel
  const cancelResult = await cancelPaymentOrder.execute(terminalGuardSaleId);
  return result(
    "Cannot cancel a COMPLETED payment order",
    !cancelResult.isSuccess
  );
};

//--- Zero amount payment rejected

const zeroAmountPaymentFails = async () => {
  const addResult = await addPayment.execute({
    saleId: zeroAmountSaleId,
    paymentId: UuidVO.generate(),
    amount: 0,
    method: PaymentMethod.CARD,
  });
  return result("Payment with amount 0 is rejected", !addResult.isSuccess);
};


// --- Export
export const paymentAuditSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    cancelFromPending,
    cancelFromPartial,
    addPaymentToCancelledFails,
    exhaustedRetriesFailsOrder,
    failedOrderCancelsSale,
    failedOrderRestoresStock,
    addPaymentToFailedFails,
    cancelCompletedFails,
    zeroAmountPaymentFails,
  ],
};
