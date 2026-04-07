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

const suiteId = "iter2-sales";
const suiteName = "Sales (Iter 2)";
const suiteDescription =
  "Venta completa con multiples productos y confirmacion cross-context";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name: name,
    suite: suiteName,
    passed: passed,
    message: passed ? undefined : message,
  };
}
const product1Id = UuidVO.generate();
const product2Id = UuidVO.generate();
const product3Id = UuidVO.generate();
const sale1Id = UuidVO.generate();
const sale2Id = UuidVO.generate();

//--- Setup & Teardown

const setup = async () => {
  await registerProduct.execute({
    id: product1Id,
    name: "Item 2A",
    price: 10,
    stock: 10,
    reservedStock: 0,
  });
  await registerProduct.execute({
    id: product2Id,
    name: "Item 2B",
    price: 20,
    stock: 10,
    reservedStock: 0,
  });
  await registerProduct.execute({
    id: product3Id,
    name: "Item 2C",
    price: 30,
    stock: 10,
    reservedStock: 0,
  });
  await createSale.execute({
    id: sale1Id,
    itemIds: [],
    createdAt: new Date(),
  });
  await createSale.execute({
    id: sale2Id,
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

const createSaleTest = async () => {
  await createSale.execute({
    id: sale1Id,
    itemIds: [],
    createdAt: new Date(),
  });
  await addItemToSale.execute({
    saleId: sale1Id,
    itemId: product1Id,
    quantity: 1,
  });
  await addItemToSale.execute({
    saleId: sale1Id,
    itemId: product2Id,
    quantity: 2,
  });
  await addItemToSale.execute({
    saleId: sale1Id,
    itemId: product3Id,
    quantity: 3,
  });
  const sale = await saleRepository.getSaleById(sale1Id);
  const total = sale.getValue()!.getTotal().getValue();
  return result("Create sale", total === 140);
};

const commitSaleTest = async () => {
  await registerSale.execute(sale1Id);

  const [product1, product2, product3] = (
    await getProducts.execute([product1Id, product2Id, product3Id])
  ).getValue()!;

  const product1Stock = product1.getStock();
  const product2Stock = product2.getStock();
  const product3Stock = product3.getStock();
  return result(
    "Behavior cross context when register sale, all products stock decreases",
    product1Stock === 9 && product2Stock === 8 && product3Stock === 7
  );
};

const tryingToCalcelACompletedSaleTest = async () => {
  const resultCancelSale = await cancelSale.execute(sale1Id);
  return result(
    "Trying to cancel a completed sale should return a controlled domain error",
    !resultCancelSale.isSuccess
  );
};

const addItemsToOtherSaleTest = async () => {
  await addItemToSale.execute({
    saleId: sale2Id,
    itemId: product1Id,
    quantity: 3,
  });
  await addItemToSale.execute({
    saleId: sale2Id,
    itemId: product2Id,
    quantity: 2,
  });
  await addItemToSale.execute({
    saleId: sale2Id,
    itemId: product3Id,
    quantity: 1,
  });
  const [product1Stock, product2Stock, product3Stock] = (
    await getProducts.execute([product1Id, product2Id, product3Id])
  )
    .getValue()!
    .map((product) => product.getStock());

  return result(
    "Behavior cross context when add items to other sale, all products stock decreases",
    product1Stock === 6 && product2Stock === 6 && product3Stock === 6
  );
};

const cancelSaleTest = async () => {
  await cancelSale.execute(sale2Id);
  const [product1Stock, product2Stock, product3Stock] = (
    await getProducts.execute([product1Id, product2Id, product3Id])
  )
    .getValue()!
    .map((product) => product.getStock());
  return result(
    "Cancel current sale should release reserved stock and restore stock to state before this sale",
    product1Stock === 9 && product2Stock === 8 && product3Stock === 7
  );
};

// --- Export
export const saleSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    createSaleTest,
    commitSaleTest,
    tryingToCalcelACompletedSaleTest,
    addItemsToOtherSaleTest,
    cancelSaleTest,
  ],
};
