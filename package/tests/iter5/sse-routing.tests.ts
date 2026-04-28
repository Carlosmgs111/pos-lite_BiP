import type { Suite, TestResult } from "../runner";
import { PaymentOrderCompleted } from "../../core/payment";
import { PaymentTransactionResult } from "../../core/payment/domain/events/PaymentTransactionResult";
import { Result } from "../../core/shared/domain/Result";
import type { DomainEvent } from "../../core/shared/domain/DomainEvent";
import { subscribeWithFilter } from "../../core/shared/infrastructure/subscribeWithFilter";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";
import { InMemoryEventBus } from "../../core/shared/infrastructure/InMemoryEventBus";

const eventBus = new InMemoryEventBus();

const suiteId = "iter5-sse-routing";
const suiteName = "SSE Event Routing (Iter 5)";
const suiteDescription =
  "subscribeWithFilter: multi-evento, predicados where, enrutamiento tipado";

function result(name: string, passed: boolean, message?: string): TestResult {
  return { name, suite: suiteName, passed, message: passed ? undefined : message };
}

// ═══════════════════════════════════════════════════════════════════════
// subscribeWithFilter: basic matching
// ═══════════════════════════════════════════════════════════════════════

const subscribeWithFilterReceivesMatchingEvents = async () => {
  const received: string[] = [];
  const unsub = subscribeWithFilter(eventBus, [
    { eventName: "payment.transaction.result" as const },
  ], {
    handle: async (event) => {
      received.push((event as DomainEvent<"payment.transaction.result">).payload.paymentId);
      return Result.ok(undefined);
    },
  });

  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "pay-1", version: 1, paymentId: "pay-1", success: true }));
  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "pay-2", version: 1, paymentId: "pay-2", success: false }));
  unsub();

  return result(
    "subscribeWithFilter receives matching events",
    received.length === 2 && received[0] === "pay-1" && received[1] === "pay-2"
  );
};

// ═══════════════════════════════════════════════════════════════════════
// subscribeWithFilter: where predicate
// ═══════════════════════════════════════════════════════════════════════

const subscribeWithFilterRespectsPredicate = async () => {
  const received: string[] = [];
  const unsub = subscribeWithFilter(eventBus, [
    {
      eventName: "payment.transaction.result" as const,
      where: (e) => (e as DomainEvent<"payment.transaction.result">).payload.success === true,
    },
  ], {
    handle: async (event) => {
      received.push((event as DomainEvent<"payment.transaction.result">).payload.paymentId);
      return Result.ok(undefined);
    },
  });

  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "s1", version: 1, paymentId: "success-1", success: true }));
  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "f1", version: 1, paymentId: "fail-1", success: false }));
  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "s2", version: 1, paymentId: "success-2", success: true }));
  unsub();

  return result(
    "subscribeWithFilter respects where predicate (only success=true events)",
    received.length === 2 && received[0] === "success-1" && received[1] === "success-2"
  );
};

// ═══════════════════════════════════════════════════════════════════════
// subscribeWithFilter: multi-event subscription
// ═══════════════════════════════════════════════════════════════════════

const subscribeWithFilterMultiEvent = async () => {
  const received: string[] = [];
  const unsub = subscribeWithFilter(eventBus, [
    { eventName: "payment.transaction.result" as const },
    { eventName: "payment.order.completed" as const },
  ], {
    handle: async (event) => {
      received.push(event.eventName);
      return Result.ok(undefined);
    },
  });

  await eventBus.publish(PaymentTransactionResult.create({ aggregateId: "x", version: 1, paymentId: "x", success: true }));
  const saleId = UuidVO.generate();
  await eventBus.publish(PaymentOrderCompleted.create({ aggregateId: saleId, version: 1, saleId }));
  unsub();

  const hasTransactionResult = received.includes("payment.transaction.result");
  const hasOrderCompleted = received.includes("payment.order.completed");
  return result(
    "subscribeWithFilter handles multi-event subscription",
    received.length === 2 && hasTransactionResult && hasOrderCompleted
  );
};

// ─── Export ────────────────────────────────────────────────────────────
export const sseRoutingSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  tests: [
    subscribeWithFilterReceivesMatchingEvents,
    subscribeWithFilterRespectsPredicate,
    subscribeWithFilterMultiEvent,
  ],
};
