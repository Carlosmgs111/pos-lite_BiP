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
  addPayment,
  paymentCommit,
} from "../../core/payment";
import { PaymentMethod } from "../../core/payment";
import { PaymentOrderStatus } from "../../core/payment/domain/PaymentOrderStatus";
import { SaleStatus } from "../../core/sales/domain/SaleStatus";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter3-payment-lifecycle";
const suiteName = "Payment Lifecycle (Iter 3)";
const suiteDescription =
  "Transiciones PENDING → PARTIAL → COMPLETED con resultados externos";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

const productId = UuidVO.generate();
// Sequential: tracks PENDING → PENDING → PENDING → PARTIAL → COMPLETED
const sequentialSaleId = UuidVO.generate();
// Single full payment
const fullPaymentSaleId = UuidVO.generate();
// Cash overpayment
const cashOverpaySaleId = UuidVO.generate();
// Failed payment reverts state
const failedPaymentSaleId = UuidVO.generate();

const payment1Id = UuidVO.generate();
const payment2Id = UuidVO.generate();
const payment3Id = UuidVO.generate();
const payment4Id = UuidVO.generate();
const payment5Id = UuidVO.generate();
const payment6Id = UuidVO.generate();

// Track payment IDs across sequential tests
const sequentialPaymentIds: string[] = [];

//--- Setup & Teardown

const setup = async () => {
  await registerProduct.execute({
    id: productId,
    name: "Lifecycle Product",
    price: 100,
    stock: 30,
    reservedStock: 0,
  });
  // sequentialSaleId: 2 items x $100 = $200
  await createSale.execute({
    id: sequentialSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: sequentialSaleId,
    itemId: productId,
    quantity: 2,
  });
  await registerSale.execute(sequentialSaleId);
  // fullPaymentSaleId: 1 item x $100 = $100
  await createSale.execute({
    id: fullPaymentSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: fullPaymentSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(fullPaymentSaleId);
  // cashOverpaySaleId: 1 item x $100 = $100
  await createSale.execute({
    id: cashOverpaySaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: cashOverpaySaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(cashOverpaySaleId);
  // failedPaymentSaleId: 1 item x $100 = $100
  await createSale.execute({
    id: failedPaymentSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: failedPaymentSaleId,
    itemId: productId,
    quantity: 1,
  });
  await registerSale.execute(failedPaymentSaleId);
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

//--- Sequential tests (share sequentialSaleId order)

const newOrderIsPending = async () => {
  const po = (
    await paymentOrderRepository.findBySaleId(sequentialSaleId)
  ).getValue()!;
  return result(
    "New PaymentOrder starts as PENDING",
    po.getStatus() === PaymentOrderStatus.PENDING
  );
};

const firstPaymentBelowTotalKeepsPending = async () => {
  // Pay $80 of $200
  const addResult = await addPayment.execute(sequentialSaleId, {
    id: payment1Id,
    amount: 80,
    method: PaymentMethod.CARD,
  });
  sequentialPaymentIds.push(addResult.getValue()!);
  const po = (
    await paymentOrderRepository.findBySaleId(sequentialSaleId)
  ).getValue()!;
  return result(
    "Payment below total keeps order as PENDING",
    po.getStatus() === PaymentOrderStatus.PENDING
  );
};

const secondPaymentStillBelowKeepsPending = async () => {
  // Pay $60 more → total $140 of $200
  const addResult = await addPayment.execute(sequentialSaleId, {
    id: payment2Id,
    amount: 60,
    method: PaymentMethod.TRANSFER,
  });
  sequentialPaymentIds.push(addResult.getValue()!);
  const po = (
    await paymentOrderRepository.findBySaleId(sequentialSaleId)
  ).getValue()!;
  return result(
    "Second payment still below total keeps order as PENDING",
    po.getStatus() === PaymentOrderStatus.PENDING
  );
};

const coveringPaymentTransitionsToPartial = async () => {
  // Pay $60 more → total $200 of $200 — coverage reached, all payments still PENDING
  const addResult = await addPayment.execute(sequentialSaleId, {
    id: payment3Id,
    amount: 60,
    method: PaymentMethod.CARD,
  });
  sequentialPaymentIds.push(addResult.getValue()!);
  const po = (
    await paymentOrderRepository.findBySaleId(sequentialSaleId)
  ).getValue()!;
  return result(
    "Covering payment transitions order to PARTIAL (awaiting external confirmation)",
    po.getStatus() === PaymentOrderStatus.PARTIAL &&
      po.getChange().getValue() === 0
  );
};

const partialPaymentsConfirmedCompleteOrder = async () => {
  // Confirm all 3 payments externally
  for (const paymentId of sequentialPaymentIds) {
    const paymentResult = await paymentCommit.execute(paymentId, true);
    if (!paymentResult.isSuccess) {
      return result("Payment confirmation failed", false);
    }
  }
  const poResult = await paymentOrderRepository.findBySaleId(sequentialSaleId);
  if (!poResult.isSuccess) {
    return result("Order not found", false);
  }
  return result(
    "Order transitions to COMPLETED once all payments are externally confirmed",
    poResult.getValue()!.getStatus() === PaymentOrderStatus.COMPLETED
  );
};

const paymentOnCompletedOrderFails = async () => {
  // sequentialSaleId is already COMPLETED
  const payResult = await addPayment.execute(sequentialSaleId, {
    id: payment4Id,
    amount: 10,
    method: PaymentMethod.CASH,
  });
  return result(
    "Adding payment to COMPLETED order returns domain error",
    !payResult.isSuccess
  );
};

//--- Independent tests

const singleFullPaymentBecomesPartial = async () => {
  // Pay $100 of $100 in one shot — PARTIAL, not COMPLETED yet
  await addPayment.execute(fullPaymentSaleId, {
    id: payment4Id,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  const po = (
    await paymentOrderRepository.findBySaleId(fullPaymentSaleId)
  ).getValue()!;
  return result(
    "Single payment covering full amount transitions to PARTIAL",
    po.getStatus() === PaymentOrderStatus.PARTIAL &&
      po.getChange().getValue() === 0
  );
};

const cashOverpaymentBecomesPartialWithChange = async () => {
  // Pay $150 cash on $100 — PARTIAL with change 50
  await addPayment.execute(cashOverpaySaleId, {
    id: payment5Id,
    amount: 150,
    method: PaymentMethod.CASH,
  });
  const po = (
    await paymentOrderRepository.findBySaleId(cashOverpaySaleId)
  ).getValue()!;
  return result(
    "Cash overpayment transitions to PARTIAL with correct change",
    po.getStatus() === PaymentOrderStatus.PARTIAL &&
      po.getChange().getValue() === 50
  );
};

const failedPaymentRevertsOrderToPending = async () => {
  // Add a covering payment → PARTIAL
  const addResult = await addPayment.execute(failedPaymentSaleId, {
    id: payment6Id,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  const paymentId = addResult.getValue()!;
  // External processor reports failure
  await paymentCommit.execute(paymentId, false);
  const po = (
    await paymentOrderRepository.findBySaleId(failedPaymentSaleId)
  ).getValue()!;
  return result(
    "Failed payment reverts order to PENDING (coverage dropped below total)",
    po.getStatus() === PaymentOrderStatus.PENDING &&
      po.getChange().getValue() === 0
  );
};

//--- Cross-context event: PaymentOrderCompleted → Sale COMPLETED

const saleCompletedAfterAllPaymentsConfirmed = async () => {
  // sequentialSaleId had all payments confirmed in partialPaymentsConfirmedCompleteOrder
  // The PaymentOrderCompleted event should have transitioned the sale to COMPLETED
  const sale = (await saleRepository.getSaleById(sequentialSaleId)).getValue()!;
  return result(
    "Sale transitions to COMPLETED via cross-context event after all payments confirmed",
    sale.getStatus() === SaleStatus.COMPLETED
  );
};

const saleStaysReadyToPayWhileOrderPartial = async () => {
  // fullPaymentSaleId has a covered but not-yet-confirmed payment (PARTIAL)
  const sale = (
    await saleRepository.getSaleById(fullPaymentSaleId)
  ).getValue()!;
  return result(
    "Sale stays READY_TO_PAY while PaymentOrder is PARTIAL (awaiting confirmation)",
    sale.getStatus() === SaleStatus.READY_TO_PAY
  );
};

// --- Export
export const paymentLifecycleSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    newOrderIsPending,
    firstPaymentBelowTotalKeepsPending,
    secondPaymentStillBelowKeepsPending,
    coveringPaymentTransitionsToPartial,
    partialPaymentsConfirmedCompleteOrder,
    paymentOnCompletedOrderFails,
    singleFullPaymentBecomesPartial,
    cashOverpaymentBecomesPartialWithChange,
    failedPaymentRevertsOrderToPending,
    saleCompletedAfterAllPaymentsConfirmed,
    saleStaysReadyToPayWhileOrderPartial,
  ],
};
