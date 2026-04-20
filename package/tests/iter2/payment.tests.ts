import type { Suite, TestResult } from "../runner";
import {
  registerProduct,
  createSale,
  addItemToSale,
  registerSale,
  getProducts,
} from "../../core";
import { cancelSale, saleRepository } from "../../core/sales";
import { productRepository } from "../../core/inventory";
import { paymentOrderRepository, addPayment, confirmPayment } from "../../core/payment";
import { PaymentMethod } from "../../core/payment";
import { PaymentOrderStatus } from "../../core/payment/domain/PaymentOrderStatus";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter2-payment";
const suiteName = "Payment & State Guards (Iter 2)";
const suiteDescription =
  "Creacion de payment order via evento, pagos parciales/exactos/cash, fail-fast en ventas no-draft";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

const productId = UuidVO.generate();
const saleId = UuidVO.generate();
const saleId2 = UuidVO.generate();
const saleExactPaymentId = UuidVO.generate();
const cancelledSaleId = UuidVO.generate();

//--- Setup & Teardown

const setup = async () => {
  await registerProduct.execute({
    id: productId,
    name: "Payment Test Product",
    price: 50,
    stock: 40,
    reservedStock: 0,
  });
  // saleId: for event creation + partial payments + change
  await createSale.execute({ id: saleId, itemIds: [], createdAt: new Date() });
  // cancelledSaleId: for cancel/confirm guards
  await createSale.execute({ id: cancelledSaleId, itemIds: [], createdAt: new Date() });
  // saleId2: for non-cash exceeds total test
  await createSale.execute({ id: saleId2, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: saleId2, itemId: productId, quantity: 4 });
  await registerSale.execute(saleId2);
  // saleExactPaymentId: for exact payment and completed status tests
  await createSale.execute({ id: saleExactPaymentId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: saleExactPaymentId, itemId: productId, quantity: 2 });
  await registerSale.execute(saleExactPaymentId);
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

//--- Tests

const paymentOrderCreatedOnConfirm = async () => {
  await addItemToSale.execute({ saleId, itemId: productId, quantity: 4 });
  await registerSale.execute(saleId);
  const paymentOrderResult = await paymentOrderRepository.findBySaleId(saleId);
  const paymentOrder = paymentOrderResult.getValue();
  return result(
    "Confirming a sale publishes SalesConfirmed and creates a PaymentOrder",
    paymentOrder !== null && paymentOrder!.getTotalAmount().getValue() === 200
  );
};

const addItemToConfirmedSaleFailsFast = async () => {
  const stockBefore = (await getProducts.execute([productId]))
    .getValue()![0].getStock();
  const addResult = await addItemToSale.execute({
    saleId,
    itemId: productId,
    quantity: 1,
  });
  const stockAfter = (await getProducts.execute([productId]))
    .getValue()![0].getStock();
  return result(
    "Adding item to confirmed sale fails fast without reserving stock",
    !addResult.isSuccess && stockBefore === stockAfter
  );
};

const addItemToCancelledSaleFailsFast = async () => {
  await addItemToSale.execute({ saleId: cancelledSaleId, itemId: productId, quantity: 2 });
  await cancelSale.execute(cancelledSaleId);
  const stockBefore = (await getProducts.execute([productId]))
    .getValue()![0].getStock();
  const addResult = await addItemToSale.execute({
    saleId: cancelledSaleId,
    itemId: productId,
    quantity: 1,
  });
  const stockAfter = (await getProducts.execute([productId]))
    .getValue()![0].getStock();
  return result(
    "Adding item to cancelled sale fails fast without reserving stock",
    !addResult.isSuccess && stockBefore === stockAfter
  );
};

const cancelConfirmedSaleFails = async () => {
  const cancelResult = await cancelSale.execute(saleId);
  return result(
    "Cancelling a confirmed sale returns a domain error",
    !cancelResult.isSuccess
  );
};

const confirmCancelledSaleFails = async () => {
  const confirmResult = await registerSale.execute(cancelledSaleId);
  return result(
    "Confirming a cancelled sale returns a domain error",
    !confirmResult.isSuccess
  );
};

// --- Payment domain tests ---

const coveredPaymentsBecomePartial = async () => {
  // total = 200 (4 items x $50) — 3 payments totalling 272.7, all PENDING
  await addPayment.execute({ saleId, paymentId: UuidVO.generate(), amount: 90.9, method: PaymentMethod.CARD });
  await addPayment.execute({ saleId, paymentId: UuidVO.generate(), amount: 90.9, method: PaymentMethod.TRANSFER });
  await addPayment.execute({ saleId, paymentId: UuidVO.generate(), amount: 90.9, method: PaymentMethod.CASH });
  const po = (await paymentOrderRepository.findBySaleId(saleId)).getValue()!;
  return result(
    "When sum of pending payments covers total, order transitions to PARTIAL with change",
    po.getStatus() === PaymentOrderStatus.PARTIAL && po.getChange().getValue() === 72.7
  );
};

const nonCashExceedsTotalFails = async () => {
  // total = 200 (4 items x $50), first cash is fine, second transfer exceeds
  await addPayment.execute({ saleId: saleId2, paymentId: UuidVO.generate(), amount: 90.9, method: PaymentMethod.CASH });
  const failResult = await addPayment.execute({ saleId: saleId2, paymentId: UuidVO.generate(), amount: 150, method: PaymentMethod.TRANSFER });
  return result(
    "Non-cash payment that exceeds total returns domain error",
    !failResult.isSuccess
  );
};

const exactPaymentCompletesOrderAfterResult = async () => {
  // total = 100 (2 items x $50)
  const paymentId = UuidVO.generate();
  await addPayment.execute({
    saleId: saleExactPaymentId,
    paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  // External processor confirms success
  await confirmPayment.execute(paymentId, true);
  const po = (await paymentOrderRepository.findBySaleId(saleExactPaymentId)).getValue()!;
  return result(
    "Exact payment completes the order with zero change after external confirmation",
    po.getStatus() === PaymentOrderStatus.COMPLETED && po.getChange().getValue() === 0
  );
};

const paymentOnCompletedOrderFails = async () => {
  // saleExactPaymentId order is already COMPLETED from previous test
  const payResult = await addPayment.execute({
    saleId: saleExactPaymentId,
    paymentId: UuidVO.generate(),
    amount: 10,
    method: PaymentMethod.CASH,
  });
  return result(
    "Adding payment to a completed order returns domain error",
    !payResult.isSuccess
  );
};

const paymentOnNonExistentOrderFails = async () => {
  const fakeId = UuidVO.generate();
  const payResult = await addPayment.execute({
    saleId: fakeId,
    paymentId: UuidVO.generate(),
    amount: 10,
    method: PaymentMethod.CASH,
  });
  return result(
    "Adding payment to non-existent order returns PaymentOrderNotFoundError",
    !payResult.isSuccess
  );
};

// --- Export
export const paymentSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    paymentOrderCreatedOnConfirm,
    addItemToConfirmedSaleFailsFast,
    addItemToCancelledSaleFailsFast,
    cancelConfirmedSaleFails,
    confirmCancelledSaleFails,
    coveredPaymentsBecomePartial,
    nonCashExceedsTotalFails,
    exactPaymentCompletesOrderAfterResult,
    paymentOnCompletedOrderFails,
    paymentOnNonExistentOrderFails,
  ],
};
