import type { Suite, TestResult } from "../runner";
import {
  registerProduct,
  createSale,
  addItemToSale,
  registerSale,
} from "../../core";
import { saleRepository } from "../../core/sales";
import { productRepository } from "../../core/inventory";
import {
  paymentOrderRepository,
  paymentRepository,
  addPayment,
  confirmPayment,
} from "../../core/payment";
import { PaymentMethod, PaymentStatus, Payment } from "../../core/payment/domain/Payment";
import { PaymentOrderStatus } from "../../core/payment/domain/PaymentOrder";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";
import { ConcurrencyError } from "../../core/shared/domain/Errors/ConcurrencyError";

const suiteId = "iter5-aggregate-separation";
const suiteName = "Aggregate Separation (Iter 5)";
const suiteDescription =
  "Payment y PaymentOrder como agregados independientes: processing(), guards de estado, estado incremental, PaymentRepository";

function result(name: string, passed: boolean, message?: string): TestResult {
  return { name, suite: suiteName, passed, message: passed ? undefined : message };
}

// ─── IDs ───────────────────────────────────────────────────────────────
const productId = UuidVO.generate();
const cashOverpaySaleId = UuidVO.generate();
const cardProcessSaleId = UuidVO.generate();
const completedOrderSaleId = UuidVO.generate();
const directCardPaymentId = UuidVO.generate();
const directTransferPaymentId = UuidVO.generate();
const directCashPaymentId = UuidVO.generate();
const completedPaymentId = UuidVO.generate();
const failedPaymentId = UuidVO.generate();

// ─── Setup ─────────────────────────────────────────────────────────────
const setup = async () => {
  await registerProduct.execute({ id: productId, name: "Aggregate Product", price: 100, stock: 30, reservedStock: 0 });

  // Sales for PaymentOrder tests
  await createSale.execute({ id: cashOverpaySaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: cashOverpaySaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(cashOverpaySaleId);

  await createSale.execute({ id: cardProcessSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: cardProcessSaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(cardProcessSaleId);

  await createSale.execute({ id: completedOrderSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: completedOrderSaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(completedOrderSaleId);

  // Direct Payments for Payment entity tests (dummy orderId — no PaymentOrder needed)
  const dummyOrderId = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id: directCardPaymentId, paymentOrderId: dummyOrderId, method: PaymentMethod.CARD, amount: 100 }));
  await paymentRepository.save(Payment.create({ id: directTransferPaymentId, paymentOrderId: dummyOrderId, method: PaymentMethod.TRANSFER, amount: 100 }));
  await paymentRepository.save(Payment.create({ id: directCashPaymentId, paymentOrderId: dummyOrderId, method: PaymentMethod.CASH, amount: 100 }));
  await paymentRepository.save(Payment.create({ id: completedPaymentId, paymentOrderId: dummyOrderId, method: PaymentMethod.CARD, amount: 100 }));
  await paymentRepository.save(Payment.create({ id: failedPaymentId, paymentOrderId: dummyOrderId, method: PaymentMethod.CARD, amount: 100 }));

  // Transition terminal-state payments
  (await paymentRepository.findById(completedPaymentId)).getValue()!.complete();
  await paymentRepository.update((await paymentRepository.findById(completedPaymentId)).getValue()!);
  (await paymentRepository.findById(failedPaymentId)).getValue()!.fail();
  await paymentRepository.update((await paymentRepository.findById(failedPaymentId)).getValue()!);

  // Complete the completedOrderSaleId PaymentOrder
  const compPayId = UuidVO.generate();
  await addPayment.execute({ saleId: completedOrderSaleId, paymentId: compPayId, amount: 100, method: PaymentMethod.CASH });
  await confirmPayment.execute({ paymentId: compPayId, success: true });
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
  paymentRepository.purgeDb();
};

// ═══════════════════════════════════════════════════════════════════════
// Payment entity: processing() method
// ═══════════════════════════════════════════════════════════════════════

const processingSetsExternalIdForCard = async () => {
  const p = (await paymentRepository.findById(directCardPaymentId)).getValue()!;
  const r = p.processing("txn-card");
  return result("processing() sets externalId on CARD payment", r.isSuccess && p.getExternalId() === "txn-card" && p.getVersion() > 0);
};

const processingSetsExternalIdForTransfer = async () => {
  const p = (await paymentRepository.findById(directTransferPaymentId)).getValue()!;
  const r = p.processing("txn-transfer");
  return result("processing() sets externalId on TRANSFER payment", r.isSuccess && p.getExternalId() === "txn-transfer");
};

const processingFailsForCash = async () => {
  const p = (await paymentRepository.findById(directCashPaymentId)).getValue()!;
  const r = p.processing("txn-cash");
  return result("processing() fails for CASH payment", !r.isSuccess);
};

const processingFailsForCompletedPayment = async () => {
  const p = (await paymentRepository.findById(completedPaymentId)).getValue()!;
  const r = p.processing("txn-completed");
  return result("processing() fails when payment is COMPLETED (not PENDING)", !r.isSuccess);
};

const processingFailsForFailedPayment = async () => {
  const p = (await paymentRepository.findById(failedPaymentId)).getValue()!;
  const r = p.processing("txn-failed");
  return result("processing() fails when payment is FAILED (not PENDING)", !r.isSuccess);
};

// ═══════════════════════════════════════════════════════════════════════
// Payment entity: complete() with externalId guard
// ═══════════════════════════════════════════════════════════════════════

const completeFailsForCardWithoutExternalId = async () => {
  const id = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id, paymentOrderId: UuidVO.generate(), method: PaymentMethod.CARD, amount: 100 }));
  const p = (await paymentRepository.findById(id)).getValue()!;
  const r = p.complete();
  return result("complete() fails for CARD without externalId", !r.isSuccess);
};

const completeFailsForTransferWithoutExternalId = async () => {
  const id = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id, paymentOrderId: UuidVO.generate(), method: PaymentMethod.TRANSFER, amount: 100 }));
  const p = (await paymentRepository.findById(id)).getValue()!;
  const r = p.complete();
  return result("complete() fails for TRANSFER without externalId", !r.isSuccess);
};

const completeSucceedsForCash = async () => {
  const p = (await paymentRepository.findById(directCashPaymentId)).getValue()!;
  const r = p.complete();
  return result("complete() succeeds for CASH without externalId", r.isSuccess && p.getStatus() === PaymentStatus.COMPLETED);
};

const completeSucceedsForCardWithExternalId = async () => {
  const p = (await paymentRepository.findById(directCardPaymentId)).getValue()!;
  const r = p.complete();
  return result("complete() succeeds for CARD with externalId set (after processing)", r.isSuccess && p.getStatus() === PaymentStatus.COMPLETED);
};

const completeSucceedsForTransferWithExternalId = async () => {
  const p = (await paymentRepository.findById(directTransferPaymentId)).getValue()!;
  const r = p.complete();
  return result("complete() succeeds for TRANSFER with externalId set (after processing)", r.isSuccess && p.getStatus() === PaymentStatus.COMPLETED);
};

// ═══════════════════════════════════════════════════════════════════════
// Payment entity: fail() guard
// ═══════════════════════════════════════════════════════════════════════

const failFailsForCompletedPayment = async () => {
  const p = (await paymentRepository.findById(completedPaymentId)).getValue()!;
  const r = p.fail();
  return result("fail() fails when payment is COMPLETED (not PENDING)", !r.isSuccess);
};

const failFailsForFailedPayment = async () => {
  const p = (await paymentRepository.findById(failedPaymentId)).getValue()!;
  const r = p.fail();
  return result("fail() fails when payment is FAILED (not PENDING)", !r.isSuccess);
};

// ═══════════════════════════════════════════════════════════════════════
// PaymentOrder: incremental state — terminal guards
// ═══════════════════════════════════════════════════════════════════════

const registerPendingPaymentFailsOnTerminal = async () => {
  const po = (await paymentOrderRepository.findBySaleId(completedOrderSaleId)).getValue()!;
  const r = po.registerPendingPayment(50);
  return result("registerPendingPayment() fails on terminal (COMPLETED) order", !r.isSuccess);
};

const applyPaymentFailsOnTerminal = async () => {
  const po = (await paymentOrderRepository.findBySaleId(completedOrderSaleId)).getValue()!;
  const r = po.applyPayment(50);
  return result("applyPayment() fails on terminal (COMPLETED) order", !r.isSuccess);
};

const registerFailedAttemptFailsOnTerminal = async () => {
  const po = (await paymentOrderRepository.findBySaleId(completedOrderSaleId)).getValue()!;
  const r = po.registerFailedAttempt(50);
  return result("registerFailedAttempt() fails on terminal (COMPLETED) order", !r.isSuccess);
};

// ═══════════════════════════════════════════════════════════════════════
// PaymentOrder: change calculation on cash overpayment
// ═══════════════════════════════════════════════════════════════════════

const cashOverpaymentCalculatesChange = async () => {
  await addPayment.execute({ saleId: cashOverpaySaleId, paymentId: UuidVO.generate(), amount: 150, method: PaymentMethod.CASH });
  const po = (await paymentOrderRepository.findBySaleId(cashOverpaySaleId)).getValue()!;
  return result("Cash overpayment transitions to PARTIAL with correct change ($50)", po.getStatus() === PaymentOrderStatus.PARTIAL && po.getChange().getValue() === 50);
};

// ═══════════════════════════════════════════════════════════════════════
// PaymentRepository: separate operations
// ═══════════════════════════════════════════════════════════════════════

const findByExternalIdWorks = async () => {
  const found = (await paymentRepository.findByExternalId("txn-card")).getValue();
  return result("PaymentRepository.findByExternalId finds payment by transaction ID", found !== null && found.getId().getValue() === directCardPaymentId);
};

const findByPaymentOrderIdListsPayments = async () => {
  const po = (await paymentOrderRepository.findBySaleId(cardProcessSaleId)).getValue()!;
  const orderId = po.getId().getValue();
  const p1Id = UuidVO.generate();
  const p2Id = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id: p1Id, paymentOrderId: orderId, method: PaymentMethod.CARD, amount: 50 }));
  await paymentRepository.save(Payment.create({ id: p2Id, paymentOrderId: orderId, method: PaymentMethod.CASH, amount: 50 }));
  const payments = (await paymentRepository.findByPaymentOrderId(orderId)).getValue()!;
  const ids = payments.map(p => p.getId().getValue()).sort();
  return result("PaymentRepository.findByPaymentOrderId returns all payments for an order", ids.length === 2 && ids.includes(p1Id) && ids.includes(p2Id));
};

const updateWithStaleVersionFails = async () => {
  const testId = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id: testId, paymentOrderId: UuidVO.generate(), method: PaymentMethod.CASH, amount: 10 }));
  const p1 = (await paymentRepository.findById(testId)).getValue()!;
  p1.complete();
  const updateResult = await paymentRepository.update(p1);
  if (!updateResult.isSuccess) return result("Payment update concurrency - setup failed", false);
  const secondUpdate = await paymentRepository.update(p1);
  return result("PaymentRepository update fails with stale version (concurrency check)", !secondUpdate.isSuccess && secondUpdate.getError() instanceof ConcurrencyError);
};

// ─── Export ────────────────────────────────────────────────────────────
export const aggregateSeparationSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    processingSetsExternalIdForCard,
    processingSetsExternalIdForTransfer,
    processingFailsForCash,
    processingFailsForCompletedPayment,
    processingFailsForFailedPayment,
    completeFailsForCardWithoutExternalId,
    completeFailsForTransferWithoutExternalId,
    completeSucceedsForCash,
    completeSucceedsForCardWithExternalId,
    completeSucceedsForTransferWithExternalId,
    failFailsForCompletedPayment,
    failFailsForFailedPayment,
    registerPendingPaymentFailsOnTerminal,
    applyPaymentFailsOnTerminal,
    registerFailedAttemptFailsOnTerminal,
    cashOverpaymentCalculatesChange,
    findByExternalIdWorks,
    findByPaymentOrderIdListsPayments,
    updateWithStaleVersionFails,
  ],
};
