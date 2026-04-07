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
import { paymentOrderRepository } from "../../core/payment";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter2-payment";
const suiteName = "Payment & State Guards (Iter 2)";
const suiteDescription =
  "Creacion de payment order via evento, fail-fast en operaciones sobre ventas no-draft";

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
const cancelledSaleId = UuidVO.generate();

//--- Setup & Teardown

const setup = async () => {
  await registerProduct.execute({
    id: productId,
    name: "Payment Test Product",
    price: 50,
    stock: 20,
    reservedStock: 0,
  });
  await createSale.execute({
    id: saleId,
    itemIds: [],
    createdAt: new Date(),
  });
  await createSale.execute({
    id: cancelledSaleId,
    itemIds: [],
    createdAt: new Date(),
  });
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

//--- Tests

const paymentOrderCreatedOnConfirm = async () => {
  await addItemToSale.execute({
    saleId,
    itemId: productId,
    quantity: 4,
  });
  await registerSale.execute(saleId);
  const paymentOrder = await paymentOrderRepository.findBySaleId(saleId);
  return result(
    "Confirming a sale publishes SalesConfirmed event and creates a PaymentOrder",
    paymentOrder !== null
  );
};

const addItemToConfirmedSaleFailsFast = async () => {
  const stockBefore = (await getProducts.execute([productId]))
    .getValue()![0]
    .getStock();
  const addResult = await addItemToSale.execute({
    saleId,
    itemId: productId,
    quantity: 1,
  });
  const stockAfter = (await getProducts.execute([productId]))
    .getValue()![0]
    .getStock();
  return result(
    "Adding item to confirmed sale fails fast without reserving stock",
    !addResult.isSuccess && stockBefore === stockAfter
  );
};

const addItemToCancelledSaleFailsFast = async () => {
  await addItemToSale.execute({
    saleId: cancelledSaleId,
    itemId: productId,
    quantity: 2,
  });
  await cancelSale.execute(cancelledSaleId);
  const stockBefore = (await getProducts.execute([productId]))
    .getValue()![0]
    .getStock();
  const addResult = await addItemToSale.execute({
    saleId: cancelledSaleId,
    itemId: productId,
    quantity: 1,
  });
  const stockAfter = (await getProducts.execute([productId]))
    .getValue()![0]
    .getStock();
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
  ],
};
