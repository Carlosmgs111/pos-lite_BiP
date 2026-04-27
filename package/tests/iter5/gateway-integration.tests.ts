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
  webhookHandler,
} from "../../core/payment";
import { PaymentMethod, PaymentStatus, Payment } from "../../core/payment/domain/Payment";
import { PaymentOrderStatus, PaymentOrder } from "../../core/payment/domain/PaymentOrder";
import { ProcessPayment } from "../../core/payment/application/use-cases/ProcessPayment";
import { ReconcilePayment } from "../../core/payment/application/use-cases/ReconcilePayment";
import type { PaymentGateway, PaymentRequest } from "../../core/payment/domain/PaymentGateway";
import { GatewayTransactionStatus } from "../../core/payment/domain/PaymentGateway";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter5-gateway-integration";
const suiteName = "Gateway Integration (Iter 5)";
const suiteDescription =
  "ProcessPayment con gateway mock, ReconcilePayment con retry/backoff, PaymentWebhookHandler idempotente";

function result(name: string, passed: boolean, message?: string): TestResult {
  return { name, suite: suiteName, passed, message: passed ? undefined : message };
}

// ─── Mock Payment Gateway ─────────────────────────────────────────────
class MockPaymentGateway implements PaymentGateway {
  private nextId = 0;
  transactions = new Map<string, GatewayTransactionStatus>();

  async requestPayment(_request: PaymentRequest): Promise<string> {
    const txId = `mock-txn-${++this.nextId}`;
    this.transactions.set(txId, GatewayTransactionStatus.PENDING);
    return txId;
  }

  async queryStatus(transactionId: string): Promise<GatewayTransactionStatus> {
    return this.transactions.get(transactionId) ?? GatewayTransactionStatus.NOT_FOUND;
  }

  setStatus(transactionId: string, status: GatewayTransactionStatus): void {
    this.transactions.set(transactionId, status);
  }
}

// ─── IDs ───────────────────────────────────────────────────────────────
const productId = UuidVO.generate();
const reconcileSaleId = UuidVO.generate();
const webhookSaleId = UuidVO.generate();

// ─── Setup ─────────────────────────────────────────────────────────────
const setup = async () => {
  await registerProduct.execute({ id: productId, name: "Gateway Product", price: 100, stock: 20, reservedStock: 0 });

  await createSale.execute({ id: reconcileSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: reconcileSaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(reconcileSaleId);
  await paymentOrderRepository.save(PaymentOrder.create({ saleId: reconcileSaleId, totalAmount: 100 }).getValue()!);

  await createSale.execute({ id: webhookSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: webhookSaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(webhookSaleId);
  await paymentOrderRepository.save(PaymentOrder.create({ saleId: webhookSaleId, totalAmount: 100 }).getValue()!);
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
  paymentRepository.purgeDb();
};

// ═══════════════════════════════════════════════════════════════════════
// ProcessPayment use case
// ═══════════════════════════════════════════════════════════════════════

const processPaymentLinksExternalId = async () => {
  const mockGateway = new MockPaymentGateway();
  const processPayment = new ProcessPayment(paymentRepository, mockGateway);

  const payId = UuidVO.generate();
  await paymentRepository.save(Payment.create({ id: payId, paymentOrderId: UuidVO.generate(), method: PaymentMethod.CARD, amount: 100 }));

  const r = await processPayment.execute(payId, { paymentId: payId, amount: 100, method: PaymentMethod.CARD });
  if (!r.isSuccess) return result(r.getError() as unknown as string, false);

  const p = (await paymentRepository.findById(payId)).getValue()!;
  return result("ProcessPayment links payment to external transaction ID (via processing())", r.isSuccess && p.getExternalId() !== undefined && p.getVersion() > 0);
};

const processPaymentFailsForNonexistentPayment = async () => {
  const mockGateway = new MockPaymentGateway();
  const processPayment = new ProcessPayment(paymentRepository, mockGateway);
  const r = await processPayment.execute(UuidVO.generate(), { paymentId: UuidVO.generate(), amount: 100, method: PaymentMethod.CARD });
  return result("ProcessPayment fails when payment not found", !r.isSuccess);
};

// ═══════════════════════════════════════════════════════════════════════
// ReconcilePayment use case
// ═══════════════════════════════════════════════════════════════════════

const reconcileReturnsPending = async () => {
  const mockGateway = new MockPaymentGateway();
  const txId = await mockGateway.requestPayment({ paymentId: "x", amount: 100, method: PaymentMethod.CARD });
  const reconcile = new ReconcilePayment(mockGateway, confirmPayment);
  const r = await reconcile.execute(txId);
  return result("ReconcilePayment returns PENDING when gateway status is PENDING", r.isSuccess && r.getValue() === GatewayTransactionStatus.PENDING);
};

const reconcileReturnsNotFound = async () => {
  const mockGateway = new MockPaymentGateway();
  const reconcile = new ReconcilePayment(mockGateway, confirmPayment);
  const r = await reconcile.execute("nonexistent-txn");
  return result("ReconcilePayment returns NOT_FOUND for unknown transaction", r.isSuccess && r.getValue() === GatewayTransactionStatus.NOT_FOUND);
};

const reconcileCompletesOnSuccess = async () => {
  const payId = UuidVO.generate();
  await addPayment.execute({ saleId: reconcileSaleId, paymentId: payId, amount: 100, method: PaymentMethod.CARD });

  const mockGateway = new MockPaymentGateway();
  const processPayment = new ProcessPayment(paymentRepository, mockGateway);
  const processR = await processPayment.execute(payId, { paymentId: payId, amount: 100, method: PaymentMethod.CARD });
  if (!processR.isSuccess) return result(processR.getError() as unknown as string, false);

  const payment = (await paymentRepository.findById(payId)).getValue()!;
  mockGateway.setStatus(payment.getExternalId()!, GatewayTransactionStatus.SUCCEEDED);

  const reconcile = new ReconcilePayment(mockGateway, confirmPayment);
  const r = await reconcile.execute(processR.getValue());
  if (!r.isSuccess) return result(r.getError() as unknown as string, false);

  const poAfter = (await paymentOrderRepository.findBySaleId(reconcileSaleId)).getValue()!;
  return result("ReconcilePayment confirms successful payment (SUCCEEDED) and completes PaymentOrder", r.isSuccess && r.getValue() === GatewayTransactionStatus.SUCCEEDED && poAfter.getStatus() === PaymentOrderStatus.COMPLETED);
};

const reconcileFailsOnFailedTransaction = async () => {
  const payId = UuidVO.generate();
  await addPayment.execute({ saleId: webhookSaleId, paymentId: payId, amount: 100, method: PaymentMethod.CARD });

  const mockGateway = new MockPaymentGateway();
  const processPayment = new ProcessPayment(paymentRepository, mockGateway);
  const processR = await processPayment.execute(payId, { paymentId: payId, amount: 100, method: PaymentMethod.CARD });
  if (!processR.isSuccess) return result(processR.getError() as unknown as string, false);

  const payment = (await paymentRepository.findById(payId)).getValue()!;
  mockGateway.setStatus(payment.getExternalId()!, GatewayTransactionStatus.FAILED);

  const reconcile = new ReconcilePayment(mockGateway, confirmPayment);
  const r = await reconcile.execute(processR.getValue());
  if (!r.isSuccess) return result(r.getError() as unknown as string, false);

  const poAfter = (await paymentOrderRepository.findBySaleId(webhookSaleId)).getValue()!;
  return result("ReconcilePayment confirms failed payment (FAILED) and registers failed attempt on order", r.isSuccess && r.getValue() === GatewayTransactionStatus.FAILED && poAfter.getStatus() === PaymentOrderStatus.PENDING);
};

// ═══════════════════════════════════════════════════════════════════════
// PaymentWebhookHandler
// ═══════════════════════════════════════════════════════════════════════

const webhookConfirmsPayment = async () => {
  const po = (await paymentOrderRepository.findBySaleId(webhookSaleId)).getValue()!;
  const orderId = po.getId().getValue();
  const payId = UuidVO.generate();

  await paymentRepository.save(Payment.create({ id: payId, paymentOrderId: orderId, method: PaymentMethod.CARD, amount: 100 }));
  const rp = (await paymentRepository.findById(payId)).getValue()!;
  rp.processing("webhook-txn-1");
  await paymentRepository.update(rp);

  await webhookHandler.handle({ provider: "test", payload: { transactionId: "webhook-txn-1", success: true } });

  const confirmedPayment = (await paymentRepository.findById(payId)).getValue()!;
  return result("Webhook confirms payment via transactionId", confirmedPayment.getStatus() === PaymentStatus.COMPLETED);
};

const webhookIsIdempotent = async () => {
  try {
    await webhookHandler.handle({ provider: "test", payload: { transactionId: "webhook-txn-1", success: true } });
    return result("Webhook with duplicate transactionId is idempotent (no error thrown)", true);
  } catch {
    return result("Webhook with duplicate transactionId is idempotent (no error thrown)", false);
  }
};

// ─── Export ────────────────────────────────────────────────────────────
export const gatewayIntegrationSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    processPaymentLinksExternalId,
    processPaymentFailsForNonexistentPayment,
    reconcileReturnsPending,
    reconcileReturnsNotFound,
    reconcileCompletesOnSuccess,
    reconcileFailsOnFailedTransaction,
    webhookConfirmsPayment,
    webhookIsIdempotent,
  ],
};
