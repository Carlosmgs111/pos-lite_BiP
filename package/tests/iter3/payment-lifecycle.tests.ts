import type { Suite, TestResult } from "../runner";
import {
  registerProduct,
  createSale,
  addItemToSale,
  registerSale,
} from "../../core";
import { saleRepository } from "../../core/sales";
import { productRepository } from "../../core/inventory";
import { paymentOrderRepository, addPayment } from "../../core/payment";
import { PaymentMethod } from "../../core/payment";
import { PaymentOrderStatus } from "../../core/payment/domain/PaymentOrderStatus";
import { SaleStatus } from "../../core/sales/domain/SaleStatus";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter3-payment-lifecycle";
const suiteName = "Payment Lifecycle (Iter 3)";
const suiteDescription =
  "Transiciones de estado PENDING → PARTIAL → COMPLETED en PaymentOrder";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

const productId = UuidVO.generate();
// Sequential: tracks PENDING → PARTIAL → PARTIAL → COMPLETED
const sequentialSaleId = UuidVO.generate();
// Single full payment
const fullPaymentSaleId = UuidVO.generate();
// Cash overpayment
const cashOverpaySaleId = UuidVO.generate();

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
  await createSale.execute({ id: sequentialSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: sequentialSaleId, itemId: productId, quantity: 2 });
  await registerSale.execute(sequentialSaleId);
  // fullPaymentSaleId: 1 item x $100 = $100
  await createSale.execute({ id: fullPaymentSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: fullPaymentSaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(fullPaymentSaleId);
  // cashOverpaySaleId: 1 item x $100 = $100
  await createSale.execute({ id: cashOverpaySaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: cashOverpaySaleId, itemId: productId, quantity: 1 });
  await registerSale.execute(cashOverpaySaleId);
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

//--- Sequential tests (share sequentialSaleId order)

const newOrderIsPending = async () => {
  const po = (await paymentOrderRepository.findBySaleId(sequentialSaleId)).getValue()!;
  return result(
    "New PaymentOrder starts as PENDING",
    po.getStatus() === PaymentOrderStatus.PENDING
  );
};

const firstPartialPaymentTransitionsToPartial = async () => {
  // Pay $80 of $200
  await addPayment.execute(sequentialSaleId, { amount: 80, method: PaymentMethod.CARD });
  const po = (await paymentOrderRepository.findBySaleId(sequentialSaleId)).getValue()!;
  return result(
    "First partial payment transitions order to PARTIAL",
    po.getStatus() === PaymentOrderStatus.PARTIAL
  );
};

const secondPartialPaymentStaysPartial = async () => {
  // Pay $60 more → total paid $140 of $200
  await addPayment.execute(sequentialSaleId, { amount: 60, method: PaymentMethod.TRANSFER });
  const po = (await paymentOrderRepository.findBySaleId(sequentialSaleId)).getValue()!;
  return result(
    "Second partial payment keeps order as PARTIAL",
    po.getStatus() === PaymentOrderStatus.PARTIAL
  );
};

const finalPaymentCompletesWithZeroChange = async () => {
  // Pay remaining $60 → total paid $200 of $200
  await addPayment.execute(sequentialSaleId, { amount: 60, method: PaymentMethod.CARD });
  const po = (await paymentOrderRepository.findBySaleId(sequentialSaleId)).getValue()!;
  return result(
    "Final payment that covers total transitions to COMPLETED with zero change",
    po.getStatus() === PaymentOrderStatus.COMPLETED && po.getChange().getValue() === 0
  );
};

//--- Independent tests

const singleFullPaymentCompletes = async () => {
  // Pay $100 of $100 in one shot
  await addPayment.execute(fullPaymentSaleId, { amount: 100, method: PaymentMethod.CARD });
  const po = (await paymentOrderRepository.findBySaleId(fullPaymentSaleId)).getValue()!;
  return result(
    "Single payment covering full amount completes order directly (PENDING → COMPLETED)",
    po.getStatus() === PaymentOrderStatus.COMPLETED && po.getChange().getValue() === 0
  );
};

const cashOverpaymentCompletesWithChange = async () => {
  // Pay $150 cash on $100 total
  await addPayment.execute(cashOverpaySaleId, { amount: 150, method: PaymentMethod.CASH });
  const po = (await paymentOrderRepository.findBySaleId(cashOverpaySaleId)).getValue()!;
  return result(
    "Cash overpayment completes order and calculates correct change ($50)",
    po.getStatus() === PaymentOrderStatus.COMPLETED && po.getChange().getValue() === 50
  );
};

const paymentOnCompletedOrderFails = async () => {
  // sequentialSaleId is already COMPLETED
  const payResult = await addPayment.execute(sequentialSaleId, {
    amount: 10,
    method: PaymentMethod.CASH,
  });
  return result(
    "Adding payment to COMPLETED order returns domain error",
    !payResult.isSuccess
  );
};

//--- Cross-context event: PaymentOrderCompleted → Sale COMPLETED

const saleCompletedAfterFullPayment = async () => {
  // fullPaymentSaleId: payment was completed in singleFullPaymentCompletes
  // The PaymentOrderCompleted event should have transitioned the sale to COMPLETED
  const saleResult = await saleRepository.getSaleById(fullPaymentSaleId);
  const sale = saleResult.getValue()!;
  return result(
    "Sale transitions to COMPLETED after PaymentOrder is fully paid (cross-context event)",
    sale.getStatus() === SaleStatus.COMPLETED
  );
};

const saleStaysReadyToPayWhilePartial = async () => {
  // cashOverpaySaleId had a single cash overpayment → already COMPLETED
  // sequentialSaleId went through PARTIAL → COMPLETED
  // Use a fresh sale to test that PARTIAL doesn't trigger completion
  const partialSaleId = UuidVO.generate();
  await createSale.execute({ id: partialSaleId, itemIds: [], createdAt: new Date() });
  await addItemToSale.execute({ saleId: partialSaleId, itemId: productId, quantity: 2 });
  await registerSale.execute(partialSaleId);
  // Pay only part ($50 of $200)
  await addPayment.execute(partialSaleId, { amount: 50, method: PaymentMethod.CARD });
  const saleResult = await saleRepository.getSaleById(partialSaleId);
  const sale = saleResult.getValue()!;
  return result(
    "Sale stays READY_TO_PAY while PaymentOrder is only PARTIAL",
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
    firstPartialPaymentTransitionsToPartial,
    secondPartialPaymentStaysPartial,
    finalPaymentCompletesWithZeroChange,
    singleFullPaymentCompletes,
    cashOverpaymentCompletesWithChange,
    paymentOnCompletedOrderFails,
    saleCompletedAfterFullPayment,
    saleStaysReadyToPayWhilePartial,
  ],
};
