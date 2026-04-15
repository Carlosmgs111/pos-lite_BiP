# Payment Verification Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual payment verification system: a webhook endpoint (edge-ready) that receives external payment confirmations, and a client-side polling service with retry policy that attempts immediate verification after the payment flow.

**Architecture:** Two verification paths race to confirm a payment. The **polling verifier** starts immediately after the user completes payment, making timed requests to check status. The **webhook** is an Astro API endpoint that receives the external processor's callback. Whichever arrives first confirms the payment via `ConfirmPayment` use case. The domain's idempotent `registerPayment()` ensures double-confirmation is safe (already-completed payments return an error that is handled gracefully).

**Tech Stack:** Astro 6 (static default + Node adapter for on-demand API routes via `prerender = false`), existing DDD domain layer, Nanostores for reactive UI updates.

---

## Prerequisite: Astro Node Adapter

Currently the project is SSG-only. We need the **Node adapter** to support on-demand server-rendered API routes while keeping all pages static.

- Install `@astrojs/node` adapter
- Add adapter to `astro.config.mjs` (no `output` change needed — Astro 6 default is static)
- API routes opt into server rendering individually via `export const prerender = false`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `astro.config.mjs` | Modify | Add Node adapter |
| `src/pages/api/payment/confirm.ts` | Create | Webhook endpoint — receives external confirmation |
| `package/core/payment/application/use-cases/VerifyPayment.ts` | Create | Use case — queries PaymentOrder status by paymentId |
| `package/core/payment/index.ts` | Modify | Export new `verifyPayment` use case |
| `src/pos/services/PaymentVerifier.ts` | Create | Client-side polling service with retry policy |
| `src/pos/services/PaymentService.ts` | Modify | Integrate PaymentVerifier into processPayment flow |
| `package/tests/iter5/payment-verification.tests.ts` | Create | Tests for VerifyPayment use case + polling logic |
| `package/tests/iter5/index.ts` | Create | Barrel — registers iter5 suite |
| `src/lib/resolve-tests.ts` | Modify | Import iter5 suite registration |

---

## Task 1: Install Node Adapter

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (via pnpm add)

- [ ] **Step 1: Install @astrojs/node**

```bash
pnpm add @astrojs/node
```

- [ ] **Step 2: Add Node adapter to config**

```javascript
// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()]
  }
});
```

Note: No `output` key needed. Astro 6 default is static — all existing pages remain prerendered. Individual API routes opt into server rendering via `export const prerender = false`.

- [ ] **Step 3: Verify build still works**

```bash
pnpm build
```
Expected: Build succeeds. All existing pages remain static.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: add Node adapter for on-demand API routes"
```

---

## Task 2: VerifyPayment Use Case (Domain Layer)

**Files:**
- Create: `package/core/payment/application/use-cases/VerifyPayment.ts`
- Modify: `package/core/payment/index.ts`

This use case is a **read-only query** — it checks the current status of a Payment entity within its PaymentOrder. No state mutation, no events. It's what the polling service and webhook call to know "did this payment land?"

- [ ] **Step 1: Write the failing test**

Create `package/tests/iter5/payment-verification.tests.ts`:

```typescript
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
  confirmPayment,
  verifyPayment,
} from "../../core/payment";
import { PaymentMethod } from "../../core/payment";
import { PaymentStatus } from "../../core/payment/domain/PaymentStatus";
import { UuidVO } from "../../core/shared/domain/Uuid.VO";

const suiteId = "iter5-payment-verification";
const suiteName = "Payment Verification (Iter 5)";
const suiteDescription =
  "VerifyPayment query, polling verification, webhook idempotency";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: suiteName,
    passed,
    message: passed ? undefined : message,
  };
}

const productId = UuidVO.generate();
const pendingSaleId = UuidVO.generate();
const completedSaleId = UuidVO.generate();
const failedSaleId = UuidVO.generate();
const idempotencySaleId = UuidVO.generate();

const setup = async () => {
  await registerProduct.execute({
    id: productId,
    name: "Verify Product",
    price: 100,
    stock: 20,
    reservedStock: 0,
  });
  // Each test gets its own sale to avoid ordering dependencies
  for (const saleId of [pendingSaleId, completedSaleId, failedSaleId, idempotencySaleId]) {
    await createSale.execute({ id: saleId, itemIds: [], createdAt: new Date() });
    await addItemToSale.execute({ saleId, itemId: productId, quantity: 1 });
    await registerSale.execute(saleId);
  }
};

const teardown = async () => {
  productRepository.purgeDb();
  saleRepository.purgeDb();
  paymentOrderRepository.purgeDb();
};

// --- Verify a PENDING payment returns PENDING status
const verifyPendingPayment = async () => {
  const paymentId = UuidVO.generate();
  await addPayment.execute(pendingSaleId, {
    id: paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  const verifyResult = await verifyPayment.execute(paymentId);
  return result(
    "VerifyPayment returns PENDING for unconfirmed payment",
    verifyResult.isSuccess && verifyResult.getValue() === PaymentStatus.PENDING
  );
};

// --- Verify a COMPLETED payment returns COMPLETED status
const verifyCompletedPayment = async () => {
  const paymentId = UuidVO.generate();
  await addPayment.execute(completedSaleId, {
    id: paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute(paymentId, true);
  const verifyResult = await verifyPayment.execute(paymentId);
  return result(
    "VerifyPayment returns COMPLETED after confirmation",
    verifyResult.isSuccess && verifyResult.getValue() === PaymentStatus.COMPLETED
  );
};

// --- Verify a FAILED payment returns FAILED status
const verifyFailedPayment = async () => {
  const paymentId = UuidVO.generate();
  await addPayment.execute(failedSaleId, {
    id: paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute(paymentId, false);
  const verifyResult = await verifyPayment.execute(paymentId);
  return result(
    "VerifyPayment returns FAILED after rejection",
    verifyResult.isSuccess && verifyResult.getValue() === PaymentStatus.FAILED
  );
};

// --- Verify non-existent payment returns error
const verifyNonExistentPayment = async () => {
  const verifyResult = await verifyPayment.execute(UuidVO.generate());
  return result(
    "VerifyPayment fails for non-existent payment",
    !verifyResult.isSuccess
  );
};

// --- Double confirm is idempotent (second confirm fails gracefully)
const doubleConfirmIdempotent = async () => {
  const paymentId = UuidVO.generate();
  await addPayment.execute(idempotencySaleId, {
    id: paymentId,
    amount: 100,
    method: PaymentMethod.CARD,
  });
  await confirmPayment.execute(paymentId, true);
  // Second confirm — domain rejects (payment already COMPLETED)
  const secondResult = await confirmPayment.execute(paymentId, true);
  // The use case should handle gracefully — not crash
  return result(
    "Double confirmation is handled gracefully",
    !secondResult.isSuccess
  );
};

export const paymentVerificationSuite: Suite = {
  id: suiteId,
  name: suiteName,
  description: suiteDescription,
  setup,
  teardown,
  tests: [
    verifyPendingPayment,
    verifyCompletedPayment,
    verifyFailedPayment,
    verifyNonExistentPayment,
    doubleConfirmIdempotent,
  ],
};
```

- [ ] **Step 2: Create iter5 barrel and register the suite**

Create `package/tests/iter5/index.ts`:

```typescript
import "../../core/payment"
import { registerSuite } from "../runner";
import { paymentVerificationSuite } from "./payment-verification.tests";

registerSuite(paymentVerificationSuite);
```

Add the import in `src/lib/resolve-tests.ts` after the iter4 line:

```typescript
import '../../package/tests/iter5'; // Register iter5 suites
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm build
```
Expected: FAIL — `verifyPayment` does not exist yet.

- [ ] **Step 4: Implement VerifyPayment use case**

Create `package/core/payment/application/use-cases/VerifyPayment.ts`:

```typescript
import type { PaymentOrderRepository } from "../../domain/PaymentOrderRepository";
import type { PaymentStatus } from "../../domain/PaymentStatus";
import { Result } from "../../../shared/domain/Result";
import { PaymentOrderNotFoundError } from "../../domain/Errors/PaymentOrderNotFoundError";

export class VerifyPayment {
  constructor(private paymentRepository: PaymentOrderRepository) {}

  async execute(paymentId: string): Promise<Result<Error, PaymentStatus>> {
    const orderResult = await this.paymentRepository.findByPaymentId(paymentId);
    if (!orderResult.isSuccess) {
      return Result.fail(orderResult.getError());
    }
    if (!orderResult.getValue()) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    const paymentOrder = orderResult.getValue()!;
    const payment = paymentOrder.getPayments().find(
      (p) => p.getId().getValue() === paymentId
    );
    if (!payment) {
      return Result.fail(new PaymentOrderNotFoundError());
    }
    return Result.ok(payment.getStatus());
  }
}
```

- [ ] **Step 5: Export from payment index**

In `package/core/payment/index.ts`, add:

```typescript
import { VerifyPayment } from "./application/use-cases/VerifyPayment";
// ...
export const verifyPayment = new VerifyPayment(paymentOrderRepository);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm build
```
Expected: All iter5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package/core/payment/application/use-cases/VerifyPayment.ts \
       package/core/payment/index.ts \
       package/tests/iter5/payment-verification.tests.ts \
       package/tests/iter5/index.ts \
       src/lib/resolve-tests.ts
git commit -m "feat: VerifyPayment use case — read-only payment status query"
```

---

## Task 3: Webhook Endpoint

**Files:**
- Create: `src/pages/api/payment/confirm.ts`

This is the edge-ready endpoint that an external payment processor calls back to. It receives a payment ID and success flag, delegates to `ConfirmPayment`, and returns appropriate HTTP status codes.

- [ ] **Step 1: Create the webhook endpoint**

Create `src/pages/api/payment/confirm.ts`:

```typescript
import type { APIRoute } from "astro";
import { confirmPayment } from "../../../../package/core/payment";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.paymentId !== "string" || typeof body.success !== "boolean") {
    return new Response(
      JSON.stringify({ error: "Invalid payload. Required: { paymentId: string, success: boolean }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { paymentId, success } = body;
  const result = await confirmPayment.execute(paymentId, success);

  if (!result.isSuccess) {
    const error = result.getError();
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ confirmed: true, paymentId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```
Expected: Build succeeds. Endpoint is server-rendered (not prerendered).

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/payment/confirm.ts
git commit -m "feat: webhook endpoint POST /api/payment/confirm (edge-ready)"
```

---

## Task 4: PaymentVerifier — Client-Side Polling Service

**Files:**
- Create: `src/pos/services/PaymentVerifier.ts`
- Modify: `src/pos/services/PaymentService.ts`

The polling verifier runs immediately after the user finishes the payment flow. It polls `VerifyPayment` at increasing intervals. If the webhook confirms the payment first, the verifier detects COMPLETED status and stops. If the verifier's window expires, the webhook will eventually handle it.

**Retry Policy:**
- Max attempts: 5
- Intervals: 1s, 2s, 4s, 8s, 16s (exponential backoff)
- Stops early if payment status is COMPLETED or FAILED (terminal)

- [ ] **Step 1: Create PaymentVerifier service**

Create `src/pos/services/PaymentVerifier.ts`:

```typescript
import { verifyPayment } from "../../../package/core/payment";
import { PaymentStatus } from "../../../package/core/payment/domain/PaymentStatus";

export interface VerificationResult {
  status: PaymentStatus | "TIMEOUT";
  attempts: number;
}

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollPaymentStatus(
  paymentId: string
): Promise<VerificationResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await verifyPayment.execute(paymentId);

    if (result.isSuccess) {
      const status = result.getValue();
      if (status === PaymentStatus.COMPLETED || status === PaymentStatus.FAILED) {
        return { status, attempts: attempt };
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  return { status: "TIMEOUT", attempts: MAX_ATTEMPTS };
}
```

- [ ] **Step 2: Integrate into PaymentService.processPayment**

Modify `src/pos/services/PaymentService.ts` — replace the simulated 800ms delay with real polling:

```typescript
import { pollPaymentStatus } from "./PaymentVerifier";
import { PaymentStatus } from "../../../package/core/payment/domain/PaymentStatus";

// In processPayment method, replace setTimeout simulation:
async processPayment(method: string, amount: number) {
  const paymentId = await this.registerPayment(method, amount);
  if (!paymentId) return;

  $paymentStatus.set("processing");

  const verification = await pollPaymentStatus(paymentId);

  if (verification.status === PaymentStatus.COMPLETED) {
    // Webhook or polling confirmed — sync UI
    await this.refreshOrderStatus($saleId.get()!);
  } else if (verification.status === PaymentStatus.FAILED) {
    // Payment definitively failed
    $payments.set(
      $payments.get().map((p) =>
        p.id === paymentId
          ? { ...p, status: "failed" as PaymentEntry["status"] }
          : p
      )
    );
    await this.refreshOrderStatus($saleId.get()!);
  } else {
    // TIMEOUT — webhook will handle eventually
    showToast("Verificando pago... la confirmación llegará en breve", "info");
  }
},
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pos/services/PaymentVerifier.ts src/pos/services/PaymentService.ts
git commit -m "feat: PaymentVerifier polling service with exponential backoff"
```

---

## Task 5: Wire Webhook to UI Reactivity

**Files:**
- Modify: `src/pos/services/PaymentService.ts`

When the webhook confirms a payment and the user is still on the page, the UI should react. Since the webhook mutates the in-memory domain state directly, the PaymentService just needs to call `refreshOrderStatus` when it detects the change via polling.

This is already handled by Task 4's polling integration — when `pollPaymentStatus` detects COMPLETED (set by the webhook hitting `ConfirmPayment`), it calls `refreshOrderStatus` which syncs stores → UI reacts.

- [ ] **Step 1: Verify the full flow works end-to-end in dev**

```bash
pnpm dev
```

Test manually:
1. Start a sale in `/pos`
2. Add items, go to payment
3. Register a CARD payment
4. Observe polling starts (processing state)
5. In another terminal, hit the webhook: `curl -X POST http://localhost:4321/api/payment/confirm -H "Content-Type: application/json" -d '{"paymentId":"<id>","success":true}'`
6. UI should transition to completed

- [ ] **Step 2: Commit if any adjustments needed**

---

## Summary of the Dual Verification Flow

```
User completes payment
       │
       ├──→ PaymentService.processPayment()
       │       │
       │       ├── 1. registerPayment() → Payment created as PENDING
       │       │
       │       └── 2. pollPaymentStatus() starts polling
       │              │
       │              ├── attempt 1 (1s) → VerifyPayment → PENDING
       │              ├── attempt 2 (2s) → VerifyPayment → PENDING
       │              ├── attempt 3 (4s) → VerifyPayment → COMPLETED ← (webhook arrived!)
       │              └── return { status: COMPLETED, attempts: 3 }
       │
       │                    ↕ RACE
       │
       └──→ External Processor calls POST /api/payment/confirm
               │
               └── ConfirmPayment.execute(paymentId, true)
                      │
                      ├── Payment.complete() → PENDING → COMPLETED
                      ├── recalculateStatus() → COMPLETED
                      └── publish PaymentOrderCompleted → Sale COMPLETED
```

**Idempotency guarantee:** If both paths try to confirm, the second call to `ConfirmPayment` gets a domain error ("Can only complete a pending payment") which is handled gracefully — no crash, no double state change.

**Future (out of scope):** A cron job could sweep for payments stuck in PENDING beyond a threshold, but that's a separate iteration.
