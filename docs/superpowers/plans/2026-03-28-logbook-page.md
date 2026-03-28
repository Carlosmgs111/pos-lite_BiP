# Logbook Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a logbook system into the pos-lite Astro site that shows build progress with narrative descriptions, real test results, and DDD artifact visualizations.

**Architecture:** Astro Content Collections with glob loader for logbook entries. Custom async test runner executed at build time. Native Astro/Tailwind components for DDD visualization (aggregates, value objects, bounded context maps, port/adapter diagrams). Zero new dependencies.

**Tech Stack:** Astro 6, Tailwind CSS 4, TypeScript (strict)

**Spec:** `docs/superpowers/specs/2026-03-28-logbook-page-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/types/logbook.ts` | All shared types (Aggregate, ValueObject, Port, etc.) |
| Create | `content.config.ts` | Astro Content Collection schema for logbook |
| Create | `package/tests/runner.ts` | Test runner types, TestFn, runSuites() |
| Create | `package/tests/inventory.tests.ts` | Inventory context test suite |
| Create | `package/tests/order.tests.ts` | Order context test suite |
| Modify | `package/tests/index.ts` | Orchestrator registering all suites |
| Create | `src/components/ddd/InvariantBadge.astro` | Badge for business rules |
| Create | `src/components/ddd/ValueObjectCard.astro` | Value Object visualization |
| Create | `src/components/ddd/AggregateCard.astro` | Aggregate Root visualization |
| Create | `src/components/ddd/PortAdapterDiagram.astro` | Port/Adapter relationship |
| Create | `src/components/ddd/BoundedContextMap.astro` | Full context map overview |
| Create | `src/components/logbook/TestResultRow.astro` | Individual test result row |
| Create | `src/components/logbook/TestSuiteCard.astro` | Test suite card with progress bar |
| Create | `src/components/logbook/EntryCard.astro` | Timeline card for index |
| Create | `src/components/logbook/EntryNavigation.astro` | Prev/Next navigation |
| Create | `src/data/logbook/entry-001.md` | First logbook entry content |
| Create | `src/data/logbook/artifacts/entry-001.ts` | DDD artifacts for entry 001 |
| Create | `src/pages/logbook/index.astro` | Logbook index page |
| Create | `src/pages/logbook/[id].astro` | Entry detail page |
| Modify | `src/pages/index.astro` | Update landing page (remove old logbook import) |
| Modify | `src/layouts/Layout.astro` | Add title prop support |
| Delete | `src/logbook/` | Remove old logbook directory |

---

### Task 1: Types and Content Collection Config

**Files:**
- Create: `src/types/logbook.ts`
- Create: `content.config.ts` (project root)

- [ ] **Step 1: Create the logbook types file**

Create `src/types/logbook.ts`:

```typescript
export interface AggregateProperty {
  name: string;
  type: string;
}

export interface Invariant {
  rule: string;
  category: 'validation' | 'business' | 'consistency';
}

export interface Aggregate {
  name: string;
  properties: AggregateProperty[];
  invariants: Invariant[];
  methods: string[];
}

export interface ValueObject {
  name: string;
  shared: boolean;
  validations: string[];
}

export interface Port {
  name: string;
  context: string;
  description: string;
  adapter: string;
}

export interface BoundedContext {
  name: string;
  aggregates: Aggregate[];
  valueObjects: ValueObject[];
}

export interface LogbookArtifacts {
  boundedContexts: BoundedContext[];
  sharedValueObjects: ValueObject[];
  ports: Port[];
}

export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}
```

- [ ] **Step 2: Create the Content Collection config**

Create `content.config.ts` at project root (NOT inside src/):

```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const logbook = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/logbook' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()),
    testSuites: z.array(z.string()).default([]),
  }),
});

export const collections = { logbook };
```

- [ ] **Step 3: Commit**

```bash
git add src/types/logbook.ts content.config.ts
git commit -m "feat: add logbook types and content collection config"
```

---

### Task 2: Test Runner

**Files:**
- Create: `package/tests/runner.ts`
- Create: `package/tests/inventory.tests.ts`
- Create: `package/tests/order.tests.ts`
- Modify: `package/tests/index.ts`

- [ ] **Step 1: Create the test runner with types**

Create `package/tests/runner.ts`:

```typescript
export interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  message?: string;
}

export interface SuiteResult {
  suite: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

export type TestFn = () => Promise<TestResult>;

export interface Suite {
  name: string;
  tests: TestFn[];
}

// Map prevents duplicate registration when multiple pages import the orchestrator
const registry = new Map<string, Suite>();

export function registerSuite(suite: Suite): void {
  registry.set(suite.name, suite);
}

export async function runSuites(suiteNames: string[]): Promise<SuiteResult[]> {
  const results: SuiteResult[] = [];

  for (const name of suiteNames) {
    const suite = registry.get(name);
    if (!suite) {
      results.push({ suite: name, tests: [], passed: 0, failed: 0, total: 0 });
      continue;
    }

    const tests: TestResult[] = [];
    for (const fn of suite.tests) {
      try {
        tests.push(await fn());
      } catch (error) {
        tests.push({
          name: 'unknown',
          suite: name,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;
    results.push({ suite: name, tests, passed, failed, total: tests.length });
  }

  return results;
}
```

- [ ] **Step 2: Create inventory test suite**

Create `package/tests/inventory.tests.ts`. These tests replicate and formalize what the current `index.ts` does imperatively for the inventory context:

```typescript
import type { Suite, TestResult } from './runner';
import { registerProduct, getProduct, reserveStock } from '../core';
import { productRepository } from '../core/inventory';

function result(name: string, passed: boolean, message?: string): TestResult {
  return { name, suite: 'inventory', passed, message: passed ? undefined : message };
}

export const inventorySuite: Suite = {
  name: 'inventory',
  tests: [
    async () => {
      await registerProduct.execute({ id: 'test-inv-1', name: 'Product A', price: 10, stock: 10, reservedStock: 0 });
      const r = await getProduct.execute('test-inv-1');
      productRepository.purgeDb();
      return result('registers a product and retrieves it by id', r.isSuccess);
    },
    async () => {
      // getPrice() returns a number (cents). PriceVO stores 25.50 as 2550 cents.
      await registerProduct.execute({ id: 'test-inv-2', name: 'Product B', price: 25.50, stock: 5, reservedStock: 0 });
      const r = await getProduct.execute('test-inv-2');
      const priceInCents = r.getValue().getPrice();
      productRepository.purgeDb();
      return result('stores product with correct price in cents', priceInCents === 2550);
    },
    async () => {
      await registerProduct.execute({ id: 'test-inv-3', name: 'Product C', price: 10, stock: 10, reservedStock: 0 });
      // reserveStock use case reserves stock and should succeed for valid quantity
      const r = await reserveStock.execute({ productId: 'test-inv-3', quantity: 3 });
      productRepository.purgeDb();
      return result('reserves stock successfully for valid quantity', r.isSuccess);
    },
    async () => {
      await registerProduct.execute({ id: 'test-inv-4', name: 'Product D', price: 10, stock: 2, reservedStock: 0 });
      // Attempting to reserve more than available should fail
      const r = await reserveStock.execute({ productId: 'test-inv-4', quantity: 5 });
      productRepository.purgeDb();
      return result('fails when reserving more than available stock', !r.isSuccess);
    },
    async () => {
      const r = await getProduct.execute('nonexistent');
      productRepository.purgeDb();
      return result('returns error for nonexistent product', !r.isSuccess);
    },
  ],
};
```

**API notes** (verified from source):
- `Product.getPrice()` returns `number` (cents), not `PriceVO`
- `Product.reserveStock()` is `async` returning `Promise<Result<Error, void>>`
- All repository methods and use cases are `async`
- `reserveStock` use case is imported from `../core` (see `package/core/index.ts`)
- The `reserveStock.execute()` signature needs verification — check `package/core/inventory/application/use-cases/ReserveStock.ts` for the exact params shape. It may take `{ productId, quantity }` or just `(productId, quantity)`. Adapt accordingly.

- [ ] **Step 3: Create order test suite**

Create `package/tests/order.tests.ts`. Similar structure:

```typescript
import type { Suite, TestResult } from './runner';
import { registerProduct, createOrder, addItemToOrder } from '../core';
import { productRepository } from '../core/inventory';
import { orderRepository } from '../core/order';
import { PriceVO } from '../core/shared/domain/Price.VO';

function result(name: string, passed: boolean, message?: string): TestResult {
  return { name, suite: 'order', passed, message: passed ? undefined : message };
}

export const orderSuite: Suite = {
  name: 'order',
  tests: [
    async () => {
      await createOrder.execute({ id: 'test-ord-1', items: [], total: new PriceVO(0), createdAt: new Date() });
      const order = await orderRepository.getOrder('test-ord-1');
      const exists = order !== undefined && order !== null;
      productRepository.purgeDb();
      orderRepository.purgeDb();
      return result('creates an empty order', exists);
    },
    async () => {
      await registerProduct.execute({ id: 'p1', name: 'Item A', price: 10, stock: 10, reservedStock: 0 });
      await createOrder.execute({ id: 'test-ord-2', items: [], total: new PriceVO(0), createdAt: new Date() });
      const r = await addItemToOrder.execute({ orderId: 'test-ord-2', itemId: 'p1', quantity: 2 });
      productRepository.purgeDb();
      orderRepository.purgeDb();
      return result('adds item to order', r.isSuccess);
    },
    async () => {
      await registerProduct.execute({ id: 'p2', name: 'Item B', price: 15, stock: 10, reservedStock: 0 });
      await createOrder.execute({ id: 'test-ord-3', items: [], total: new PriceVO(0), createdAt: new Date() });
      await addItemToOrder.execute({ orderId: 'test-ord-3', itemId: 'p2', quantity: 2 });
      await addItemToOrder.execute({ orderId: 'test-ord-3', itemId: 'p2', quantity: 3 });
      const order = await orderRepository.getOrder('test-ord-3');
      // Order.toJSON() exposes total as PriceVO. 15 * 5 = 75 dollars = 7500 cents
      const totalInCents = order.toJSON().total.getValue();
      productRepository.purgeDb();
      orderRepository.purgeDb();
      return result('accumulates quantity and calculates correct total', totalInCents === 7500);
    },
  ],
};
```

**API notes** (verified from source):
- All use cases and repository methods are `async`
- `Order` has no `getTotal()` method — use `order.toJSON().total` which returns `PriceVO`
- `PriceVO.getValue()` returns value in cents
- 15 dollars * 5 qty = 75 dollars = 7500 cents

- [ ] **Step 4: Rewrite index.ts as orchestrator**

Replace `package/tests/index.ts` with:

```typescript
import { registerSuite } from './runner';
import { inventorySuite } from './inventory.tests';
import { orderSuite } from './order.tests';

registerSuite(inventorySuite);
registerSuite(orderSuite);
```

- [ ] **Step 5: Verify tests run**

Run: `cd D:/Documentos/Desktop/pos-lite && npx astro build`

Expected: Build completes without errors. The test runner registers suites but doesn't execute them yet (no page calls `runSuites` yet).

- [ ] **Step 6: Commit**

```bash
git add package/tests/runner.ts package/tests/inventory.tests.ts package/tests/order.tests.ts package/tests/index.ts
git commit -m "feat: add structured test runner with inventory and order suites"
```

---

### Task 3: DDD Visualization Components (Leaf Components)

**Files:**
- Create: `src/components/ddd/InvariantBadge.astro`
- Create: `src/components/ddd/ValueObjectCard.astro`
- Create: `src/components/ddd/AggregateCard.astro`
- Create: `src/components/ddd/PortAdapterDiagram.astro`

- [ ] **Step 1: Create InvariantBadge component**

Create `src/components/ddd/InvariantBadge.astro`:

```astro
---
interface Props {
  rule: string;
  category: 'validation' | 'business' | 'consistency';
}

const { rule, category } = Astro.props;

const colors: Record<string, string> = {
  validation: 'bg-blue-100 text-blue-800 border-blue-300',
  business: 'bg-amber-100 text-amber-800 border-amber-300',
  consistency: 'bg-purple-100 text-purple-800 border-purple-300',
};

const icons: Record<string, string> = {
  validation: '✓',
  business: '◆',
  consistency: '⟳',
};
---

<span class={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-full ${colors[category]}`}>
  <span>{icons[category]}</span>
  {rule}
</span>
```

- [ ] **Step 2: Create ValueObjectCard component**

Create `src/components/ddd/ValueObjectCard.astro`:

```astro
---
import type { ValueObject } from '../../types/logbook';

interface Props {
  vo: ValueObject;
}

const { vo } = Astro.props;
---

<div class="border border-gray-200 rounded-lg p-4 bg-white">
  <div class="flex items-center gap-2 mb-3">
    <h4 class="text-sm font-bold text-gray-900">{vo.name}</h4>
    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Value Object</span>
    {vo.shared && (
      <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Shared</span>
    )}
  </div>
  <div class="flex flex-wrap gap-1">
    {vo.validations.map((v) => (
      <span class="inline-flex items-center px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">
        {v}
      </span>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Create AggregateCard component**

Create `src/components/ddd/AggregateCard.astro`:

```astro
---
import type { Aggregate } from '../../types/logbook';
import InvariantBadge from './InvariantBadge.astro';

interface Props {
  aggregate: Aggregate;
  contextName: string;
}

const { aggregate, contextName } = Astro.props;

const contextColors: Record<string, string> = {
  Inventory: 'bg-emerald-100 text-emerald-800',
  Order: 'bg-blue-100 text-blue-800',
};
---

<div class="border border-gray-200 rounded-lg bg-white overflow-hidden">
  <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
    <h3 class="text-base font-bold text-gray-900">{aggregate.name}</h3>
    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Aggregate Root</span>
    <span class={`text-[10px] font-medium px-1.5 py-0.5 rounded ${contextColors[contextName] || 'bg-gray-100 text-gray-700'}`}>
      {contextName}
    </span>
  </div>

  <div class="p-4 space-y-4">
    {/* Properties */}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Properties</h4>
      <table class="w-full text-sm">
        <tbody>
          {aggregate.properties.map((prop) => (
            <tr class="border-b border-gray-100 last:border-0">
              <td class="py-1 font-mono text-gray-900">{prop.name}</td>
              <td class="py-1 font-mono text-gray-500 text-right">{prop.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Methods */}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Methods</h4>
      <div class="flex flex-wrap gap-1">
        {aggregate.methods.map((m) => (
          <span class="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{m}</span>
        ))}
      </div>
    </div>

    {/* Invariants */}
    {aggregate.invariants.length > 0 && (
      <div>
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invariants</h4>
        <div class="flex flex-wrap gap-2">
          {aggregate.invariants.map((inv) => (
            <InvariantBadge rule={inv.rule} category={inv.category} />
          ))}
        </div>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 4: Create PortAdapterDiagram component**

Create `src/components/ddd/PortAdapterDiagram.astro`:

```astro
---
import type { Port } from '../../types/logbook';

interface Props {
  port: Port;
}

const { port } = Astro.props;
---

<div class="flex items-center gap-0 my-2">
  {/* Port (interface) */}
  <div class="border-2 border-dashed border-gray-400 rounded-lg px-3 py-2 bg-white min-w-[140px]">
    <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Port</div>
    <div class="text-sm font-mono font-bold text-gray-800">{port.name}</div>
    <div class="text-xs text-gray-500 mt-1">{port.description}</div>
  </div>

  {/* Arrow */}
  <div class="flex items-center px-1">
    <div class="w-8 h-0.5 bg-gray-400"></div>
    <div class="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-gray-400"></div>
  </div>

  {/* Adapter (implementation) */}
  <div class="border-2 border-solid border-emerald-500 rounded-lg px-3 py-2 bg-emerald-50 min-w-[140px]">
    <div class="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Adapter</div>
    <div class="text-sm font-mono font-bold text-emerald-800">{port.adapter}</div>
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ddd/
git commit -m "feat: add DDD visualization components (InvariantBadge, ValueObjectCard, AggregateCard, PortAdapterDiagram)"
```

---

### Task 4: BoundedContextMap Component

**Files:**
- Create: `src/components/ddd/BoundedContextMap.astro`

- [ ] **Step 1: Create BoundedContextMap component**

Create `src/components/ddd/BoundedContextMap.astro`:

```astro
---
import type { BoundedContext, ValueObject, Port } from '../../types/logbook';
import AggregateCard from './AggregateCard.astro';
import ValueObjectCard from './ValueObjectCard.astro';
import PortAdapterDiagram from './PortAdapterDiagram.astro';

interface Props {
  contexts: BoundedContext[];
  sharedVOs: ValueObject[];
  ports: Port[];
}

const { contexts, sharedVOs, ports } = Astro.props;

const contextBorders: Record<string, string> = {
  Inventory: 'border-emerald-300',
  Order: 'border-blue-300',
};

const contextHeaders: Record<string, string> = {
  Inventory: 'bg-emerald-50 text-emerald-800',
  Order: 'bg-blue-50 text-blue-800',
};
---

<div class="space-y-6">
  {/* Bounded Contexts */}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {contexts.map((ctx) => (
      <div class={`border-2 rounded-xl p-4 ${contextBorders[ctx.name] || 'border-gray-300'}`}>
        <h3 class={`text-lg font-bold mb-4 px-3 py-1 rounded-lg inline-block ${contextHeaders[ctx.name] || 'bg-gray-100 text-gray-800'}`}>
          {ctx.name}
        </h3>

        <div class="space-y-3">
          {ctx.aggregates.map((agg) => (
            <AggregateCard aggregate={agg} contextName={ctx.name} />
          ))}

          {ctx.valueObjects.length > 0 && (
            <div class="space-y-2 mt-3">
              {ctx.valueObjects.map((vo) => (
                <ValueObjectCard vo={vo} />
              ))}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>

  {/* Shared Value Objects */}
  {sharedVOs.length > 0 && (
    <div class="border-2 border-dashed border-indigo-200 rounded-xl p-4">
      <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-3">Shared Domain</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sharedVOs.map((vo) => (
          <ValueObjectCard vo={vo} />
        ))}
      </div>
    </div>
  )}

  {/* Ports & Adapters */}
  {ports.length > 0 && (
    <div>
      <h3 class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Ports & Adapters</h3>
      <div class="space-y-2">
        {ports.map((p) => (
          <PortAdapterDiagram port={p} />
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ddd/BoundedContextMap.astro
git commit -m "feat: add BoundedContextMap component"
```

---

### Task 5: Logbook UI Components

**Files:**
- Create: `src/components/logbook/TestResultRow.astro`
- Create: `src/components/logbook/TestSuiteCard.astro`
- Create: `src/components/logbook/EntryCard.astro`
- Create: `src/components/logbook/EntryNavigation.astro`

- [ ] **Step 1: Create TestResultRow component**

Create `src/components/logbook/TestResultRow.astro`:

```astro
---
import type { TestResult } from '../../../package/tests/runner';

interface Props {
  testResult: TestResult;
}

const { testResult } = Astro.props;
---

<div class="flex items-start gap-2 py-1.5 text-sm">
  <span class={`flex-shrink-0 mt-0.5 ${testResult.passed ? 'text-green-600' : 'text-red-600'}`}>
    {testResult.passed ? '✓' : '✗'}
  </span>
  <div>
    <span class="text-gray-800">{testResult.name}</span>
    {testResult.message && (
      <p class="text-xs text-red-500 mt-0.5">{testResult.message}</p>
    )}
  </div>
</div>
```

- [ ] **Step 2: Create TestSuiteCard component**

Create `src/components/logbook/TestSuiteCard.astro`:

```astro
---
import type { SuiteResult } from '../../../package/tests/runner';
import TestResultRow from './TestResultRow.astro';

interface Props {
  suiteResult: SuiteResult;
}

const { suiteResult } = Astro.props;
const passRate = suiteResult.total > 0 ? (suiteResult.passed / suiteResult.total) * 100 : 0;
---

<div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
  <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
    <h4 class="text-sm font-bold text-gray-900 capitalize">{suiteResult.suite}</h4>
    <div class="flex items-center gap-2">
      <span class="text-xs text-green-700 font-medium">{suiteResult.passed} passed</span>
      {suiteResult.failed > 0 && (
        <span class="text-xs text-red-700 font-medium">{suiteResult.failed} failed</span>
      )}
    </div>
  </div>

  {/* Progress bar */}
  <div class="h-1.5 bg-gray-100">
    <div
      class={`h-full ${suiteResult.failed > 0 ? 'bg-red-500' : 'bg-green-500'}`}
      style={`width: ${passRate}%`}
    ></div>
  </div>

  <div class="px-4 py-2 divide-y divide-gray-100">
    {suiteResult.tests.map((t) => (
      <TestResultRow testResult={t} />
    ))}
  </div>
</div>
```

- [ ] **Step 3: Create EntryCard component**

Create `src/components/logbook/EntryCard.astro`:

```astro
---
import type { TestSummary } from '../../types/logbook';

interface Props {
  id: string;
  title: string;
  date: Date;
  summary: string;
  tags: string[];
  testSummary: TestSummary;
}

const { id, title, date, summary, tags, testSummary } = Astro.props;
const dateStr = date.toISOString().split('T')[0];
---

<a href={`/logbook/${id}/`} class="block group">
  <div class="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <time class="text-xs font-mono text-gray-400">{dateStr}</time>
          {testSummary.total > 0 && (
            <span class={`text-xs font-medium px-1.5 py-0.5 rounded ${testSummary.failed > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {testSummary.passed}/{testSummary.total}
            </span>
          )}
        </div>
        <h3 class="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p class="text-sm text-gray-500 mt-1 line-clamp-2">{summary}</p>
      </div>
    </div>
    {tags.length > 0 && (
      <div class="flex flex-wrap gap-1 mt-3">
        {tags.map((tag) => (
          <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
        ))}
      </div>
    )}
  </div>
</a>
```

- [ ] **Step 4: Create EntryNavigation component**

Create `src/components/logbook/EntryNavigation.astro`:

```astro
---
interface Props {
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

const { prev, next } = Astro.props;
---

<nav class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
  {prev ? (
    <a href={`/logbook/${prev.id}/`} class="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
      <span>←</span>
      <span class="max-w-[200px] truncate">{prev.title}</span>
    </a>
  ) : <div />}

  {next ? (
    <a href={`/logbook/${next.id}/`} class="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
      <span class="max-w-[200px] truncate">{next.title}</span>
      <span>→</span>
    </a>
  ) : <div />}
</nav>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/logbook/
git commit -m "feat: add logbook UI components (TestResultRow, TestSuiteCard, EntryCard, EntryNavigation)"
```

---

### Task 6: First Logbook Entry Content & Artifacts

**Files:**
- Create: `src/data/logbook/entry-001.md`
- Create: `src/data/logbook/artifacts/entry-001.ts`

- [ ] **Step 1: Create entry-001.md**

Create `src/data/logbook/entry-001.md`:

```markdown
---
title: "Entry 001 - Definicion de bounded contexts"
date: 2026-03-28
summary: "Identificacion inicial de los contextos Inventory y Order, definicion de agregados, value objects e invariantes del sistema POS."
tags: ["ddd", "architecture", "inventory", "order"]
testSuites: ["inventory", "order"]
---

## Contextos identificados

Se identificaron dos bounded contexts iniciales para el sistema POS:

**Inventory** — Gestiona el catalogo de productos, precios y control de stock. El agregado principal es `Product`, que protege invariantes de negocio como la no-negatividad del stock y la coherencia entre stock disponible y reservado.

**Order** — Gestiona el ciclo de vida de las ordenes de venta. El agregado `Order` compone `OrderItem` como entidades internas y mantiene la consistencia del total calculado.

## Comunicacion entre contextos

El contexto Order depende de Inventory a traves de ports (interfaces) definidos en su capa de aplicacion: `GetProductInfo` y `ReserveStock`. La implementacion concreta vive en la capa de infraestructura de Order, siguiendo el patron de puertos y adaptadores.

## Decisiones de arquitectura

- **Monolito modular**: ambos contextos viven en el mismo repositorio pero con fronteras claras
- **Result type**: manejo de errores funcional sin excepciones, forzando al caller a verificar exito antes de acceder al valor
- **Value Objects compartidos**: `PriceVO` vive en shared/domain ya que ambos contextos lo necesitan
- **Cero dependencias**: toda la logica de dominio es TypeScript puro, sin librerias externas

## Naturaleza evolutiva

Estos contextos son una primera aproximacion. Conforme el proyecto evolucione e itere con analisis mas profundo, los limites pueden cambiar, nuevos contextos pueden emerger, y las reglas de negocio se refinaran.
```

- [ ] **Step 2: Create artifacts data for entry-001**

Create `src/data/logbook/artifacts/entry-001.ts`:

```typescript
import type { LogbookArtifacts } from '../../../types/logbook';

export const artifacts: LogbookArtifacts = {
  boundedContexts: [
    {
      name: 'Inventory',
      aggregates: [
        {
          name: 'Product',
          properties: [
            { name: 'id', type: 'string' },
            { name: 'name', type: 'NameVO' },
            { name: 'price', type: 'PriceVO' },
            { name: 'stock', type: 'number' },
            { name: 'reservedStock', type: 'number' },
          ],
          invariants: [
            { rule: 'Stock no puede ser negativo', category: 'business' },
            { rule: 'Cantidad reservada no puede exceder stock disponible', category: 'business' },
            { rule: 'Name debe tener minimo 3 caracteres', category: 'validation' },
          ],
          methods: ['reserveStock()', 'releaseStock()'],
        },
      ],
      valueObjects: [
        {
          name: 'Name',
          shared: false,
          validations: ['Non-empty', 'Min 3 characters'],
        },
      ],
    },
    {
      name: 'Order',
      aggregates: [
        {
          name: 'Order',
          properties: [
            { name: 'id', type: 'string' },
            { name: 'items', type: 'OrderItem[]' },
            { name: 'total', type: 'PriceVO' },
            { name: 'state', type: 'OrdersStates' },
            { name: 'createdAt', type: 'Date' },
          ],
          invariants: [
            { rule: 'Total se recalcula al agregar/remover items', category: 'consistency' },
            { rule: 'Estado inicial siempre es PENDING', category: 'business' },
          ],
          methods: ['create()', 'addItem()', 'findItemById()', 'calculateTotal()'],
        },
      ],
      valueObjects: [],
    },
  ],
  sharedValueObjects: [
    {
      name: 'Price',
      shared: true,
      validations: ['Non-negative', 'Max 2 decimal places', 'Stored as cents'],
    },
  ],
  ports: [
    {
      name: 'GetProductInfo',
      context: 'Order',
      description: 'Obtiene nombre y precio de un producto del contexto Inventory',
      adapter: 'GetProductInfo (infrastructure)',
    },
    {
      name: 'ReserveStock',
      context: 'Order',
      description: 'Reserva stock de un producto en el contexto Inventory',
      adapter: 'ReserveStock (infrastructure)',
    },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/data/logbook/
git commit -m "feat: add first logbook entry with DDD artifacts data"
```

---

### Task 7: Layout Update and Logbook Pages

**Files:**
- Modify: `src/layouts/Layout.astro`
- Create: `src/pages/logbook/index.astro`
- Create: `src/pages/logbook/[id].astro`
- Modify: `src/pages/index.astro`
- Delete: `src/logbook/` (entire directory)

- [ ] **Step 1: Update Layout.astro to support title prop**

Modify `src/layouts/Layout.astro`. Change the `<title>` tag to accept a prop:

Current content:
```astro
---
import "../styles/global.css";
---
```

Replace with:
```astro
---
import "../styles/global.css";

interface Props {
  title?: string;
}

const { title = 'pos-lite' } = Astro.props;
---
```

And change `<title>Astro</title>` to `<title>{title}</title>`.

- [ ] **Step 2: Create logbook index page**

Create `src/pages/logbook/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import EntryCard from '../../components/logbook/EntryCard.astro';
import { runSuites } from '../../../package/tests/runner';
import '../../../package/tests'; // Register suites
import type { TestSummary } from '../../types/logbook';

const entries = await getCollection('logbook');
const sorted = entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

const entriesWithTests = await Promise.all(
  sorted.map(async (entry) => {
    const results = entry.data.testSuites.length > 0 ? await runSuites(entry.data.testSuites) : [];
    const testSummary: TestSummary = results.reduce(
      (acc, r) => ({
        passed: acc.passed + r.passed,
        failed: acc.failed + r.failed,
        total: acc.total + r.total,
      }),
      { passed: 0, failed: 0, total: 0 }
    );
    return { entry, testSummary };
  })
);
---

<Layout title="Bitacora - pos-lite">
  <div class="max-w-3xl mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Bitacora de Desarrollo</h1>
      <p class="text-gray-500 mt-2">Seguimiento del progreso de pos-lite — un sistema POS construido en publico con DDD, monolito modular y puertos/adaptadores.</p>
    </header>

    <div class="space-y-4">
      {entriesWithTests.map(({ entry, testSummary }) => (
        <EntryCard
          id={entry.id}
          title={entry.data.title}
          date={entry.data.date}
          summary={entry.data.summary}
          tags={entry.data.tags}
          testSummary={testSummary}
        />
      ))}
    </div>
  </div>
</Layout>
```

- [ ] **Step 3: Create entry detail page**

Create `src/pages/logbook/[id].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import TestSuiteCard from '../../components/logbook/TestSuiteCard.astro';
import EntryNavigation from '../../components/logbook/EntryNavigation.astro';
import BoundedContextMap from '../../components/ddd/BoundedContextMap.astro';
import { runSuites } from '../../../package/tests/runner';
import '../../../package/tests'; // Register suites
import type { LogbookArtifacts } from '../../types/logbook';

const artifactModules = import.meta.glob('../../data/logbook/artifacts/*.ts', { eager: true });

export async function getStaticPaths() {
  const entries = await getCollection('logbook');
  const sorted = entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return sorted.map((entry, i) => ({
    params: { id: entry.id },
    props: {
      entry,
      prev: sorted[i + 1] ? { id: sorted[i + 1].id, title: sorted[i + 1].data.title } : null,
      next: sorted[i - 1] ? { id: sorted[i - 1].id, title: sorted[i - 1].data.title } : null,
    },
  }));
}

const { entry, prev, next } = Astro.props;
const { Content } = await render(entry);

const artifactKey = Object.keys(artifactModules).find((k) => k.endsWith(`/${entry.id}.ts`));
const artifacts: LogbookArtifacts | null = artifactKey
  ? (artifactModules[artifactKey] as { artifacts: LogbookArtifacts }).artifacts
  : null;

const testResults = entry.data.testSuites.length > 0
  ? await runSuites(entry.data.testSuites)
  : [];

const dateStr = entry.data.date.toISOString().split('T')[0];
---

<Layout title={`${entry.data.title} - pos-lite`}>
  <div class="max-w-3xl mx-auto px-4 py-8">
    {/* Breadcrumb */}
    <nav class="text-sm text-gray-400 mb-6">
      <a href="/" class="hover:text-gray-600">Home</a>
      <span class="mx-1">/</span>
      <a href="/logbook/" class="hover:text-gray-600">Bitacora</a>
      <span class="mx-1">/</span>
      <span class="text-gray-600">{entry.data.title}</span>
    </nav>

    {/* Header */}
    <header class="mb-8">
      <time class="text-sm font-mono text-gray-400">{dateStr}</time>
      <h1 class="text-2xl font-bold text-gray-900 mt-1">{entry.data.title}</h1>
      {entry.data.tags.length > 0 && (
        <div class="flex flex-wrap gap-1 mt-3">
          {entry.data.tags.map((tag) => (
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
          ))}
        </div>
      )}
    </header>

    {/* Description (markdown content) */}
    <article class="max-w-none mb-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_strong]:font-bold [&_code]:font-mono [&_code]:text-sm [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:text-gray-700 [&_li]:mb-1">
      <Content />
    </article>

    {/* Test Results */}
    {testResults.length > 0 && (
      <section class="mb-8">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Test Results</h2>
        <div class="space-y-4">
          {testResults.map((suite) => (
            <TestSuiteCard suiteResult={suite} />
          ))}
        </div>
      </section>
    )}

    {/* DDD Artifacts */}
    {artifacts && (
      <section class="mb-8">
        <h2 class="text-lg font-bold text-gray-900 mb-4">DDD Artifacts</h2>
        <BoundedContextMap
          contexts={artifacts.boundedContexts}
          sharedVOs={artifacts.sharedValueObjects}
          ports={artifacts.ports}
        />
      </section>
    )}

    <EntryNavigation prev={prev} next={next} />
  </div>
</Layout>
```

- [ ] **Step 4: Update index.astro — remove old logbook import**

Replace the contents of `src/pages/index.astro` with:

```astro
---
import Layout from "../layouts/Layout.astro";
---

<Layout title="pos-lite">
  <div class="max-w-3xl mx-auto px-4 py-16 text-center">
    <h1 class="text-4xl font-bold text-gray-900">pos-lite</h1>
    <p class="text-gray-500 mt-4">Sistema POS ligero — construido en publico con DDD</p>
    <a href="/logbook/" class="inline-block mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
      Ver Bitacora
    </a>
  </div>
</Layout>
```

- [ ] **Step 5: Delete old logbook directory**

```bash
rm -rf src/logbook/
```

- [ ] **Step 6: Verify build**

Run: `cd D:/Documentos/Desktop/pos-lite && npx astro build`

Expected: Build succeeds. Pages generated at `/`, `/logbook/`, `/logbook/entry-001/`.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/Layout.astro src/pages/ content.config.ts
git add -A src/logbook/  # stages the deletion
git commit -m "feat: add logbook pages (index + detail) and update landing page"
```

---

### Task 8: Dev Server Smoke Test

- [ ] **Step 1: Start dev server and verify all pages**

Run: `cd D:/Documentos/Desktop/pos-lite && npx astro dev`

Verify these URLs work:
- `http://localhost:4321/` — Landing page with link to logbook
- `http://localhost:4321/logbook/` — Index with Entry 001 card showing test summary
- `http://localhost:4321/logbook/entry-001/` — Detail page with all 4 sections (header, content, tests, DDD artifacts)

Check:
- Test results render with green/red indicators
- DDD BoundedContextMap shows both contexts side by side
- AggregateCards show properties, methods, invariants
- ValueObjectCards show validation rules
- PortAdapterDiagrams show port → adapter arrows
- Tags render as pill badges
- EntryNavigation renders (though no prev/next for single entry)

- [ ] **Step 2: Fix any rendering issues found during smoke test**

Address any Tailwind class issues, type errors, or layout problems.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address rendering issues from smoke test"
```

Only commit if there were changes needed. If smoke test passed clean, skip this step.
