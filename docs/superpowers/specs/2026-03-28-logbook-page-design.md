# Logbook Page Design Spec

## Overview

A logbook system built into the pos-lite Astro site that documents project progress in a "build in public" format. Each entry shows three sections: a narrative description of what was accomplished, real test execution results rendered at build time, and DDD artifact visualizations (entities, aggregates, value objects with their invariants and business rules).

## Architecture Decision

**Approach:** Astro Content Collections with glob loader and Zod schema.

**Why:** Native Astro pattern for structured content. Provides type-safe frontmatter validation, automatic routing via `getStaticPaths`, and clean separation between content (markdown) and presentation (Astro components). Zero additional dependencies beyond what Astro already provides.

## Data Model

### Content Collection Schema

File: `content.config.ts` (project root — required by Astro 6)

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

### Entry Frontmatter Example

File: `src/data/logbook/entry-001.md`

```yaml
---
title: "Entry 001 - Definicion de bounded contexts"
date: 2026-03-28
summary: "Identificacion inicial de los contextos Inventory y Order, definicion de agregados, value objects e invariantes."
tags: ["ddd", "architecture", "inventory", "order"]
testSuites: ["inventory", "order"]
---

Markdown content describing the progress...
```

### DDD Artifacts Data

Each entry has an associated TypeScript file exporting the DDD artifacts to render.

File: `src/data/logbook/artifacts/entry-001.ts`

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

## Test Runner

### Test Result Types

File: `package/tests/runner.ts`

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
```

### Runner Behavior

- Test function signature: `type TestFn = () => TestResult` (synchronous — keeps build-time execution simple)
- Each suite file exports: `{ name: string, tests: TestFn[] }`
- Runner exports `runSuites(suiteNames: string[]): SuiteResult[]` (synchronous)
- **Naming convention:** artifact files must match entry filenames (e.g., `entry-001.md` → `artifacts/entry-001.ts`)
- If a suite name does not match any registered suite, it is skipped and a `SuiteResult` is returned with `{ suite: name, tests: [], passed: 0, failed: 0, total: 0 }`
- Tests execute during Astro build (server-side, same as current behavior)
- Each test function wraps assertions in try/catch: caught errors produce `{ passed: false, message: error.message }`

### Test File Structure

The current `package/tests/index.ts` is an imperative script (not a test runner). This is **new work** — rewriting it into a structured test system:
- `package/tests/runner.ts` — runner logic and types
- `package/tests/inventory.tests.ts` — inventory context tests
- `package/tests/order.tests.ts` — order context tests
- `package/tests/index.ts` — orchestrator that registers all suites

## Components

### Logbook Components (`src/components/logbook/`)

**EntryCard.astro** — Card for the index page timeline
- Props: `{ title, date, summary, tags, testSummary: TestSummary }`
- `TestSummary` type: `{ passed: number, failed: number, total: number }` (defined in `src/types/logbook.ts`)
- When `total` is 0 (no tests), the test indicator is hidden
- Shows date badge, title, summary excerpt, tag pills, and mini test result indicator
- Links to detail page

**TestSuiteCard.astro** — Renders a complete test suite result
- Props: `{ suiteResult: SuiteResult }`
- Header with suite name and pass/fail count badge
- Visual progress bar (green/red proportional)
- List of individual test results

**TestResultRow.astro** — Individual test result row
- Props: `{ testResult: TestResult }`
- Green checkmark or red X icon
- Test name and optional message

**EntryNavigation.astro** — Prev/Next navigation
- Props: `{ prev?: { id: string, title: string } | null, next?: { id: string, title: string } | null }`
- Prev/next determined by date-sorted order (computed in `getStaticPaths`, passed as props)
- Simple arrow links with entry title; hidden if null

### DDD Components (`src/components/ddd/`)

**BoundedContextMap.astro** — Overview of all contexts
- Props: `{ contexts: BoundedContext[], sharedVOs: ValueObject[], ports: Port[] }`
- Two side-by-side blocks for Inventory and Order
- Shared VOs rendered in a central row between both context blocks
- Port connections rendered using CSS: dashed borders on port cards and solid borders on adapter cards, with a horizontal arrow (CSS `::after` pseudo-element with border trick) connecting them visually. No SVG or client-side JS required.
- Color-coded per context (Inventory = emerald, Order = blue)

**AggregateCard.astro** — Aggregate Root visualization
- Props: `{ aggregate: Aggregate, contextName: string }`
- Header with aggregate name and context badge
- Properties table (name, type)
- Methods list
- Invariants section with InvariantBadge components

**ValueObjectCard.astro** — Value Object visualization
- Props: `{ vo: ValueObject }`
- Name with "Shared" badge if applicable
- Validation rules as pill badges

**InvariantBadge.astro** — Individual business rule badge
- Props: `{ rule: string, category: 'validation' | 'business' | 'consistency' }`
- Color-coded by category (amber for business, blue for validation, purple for consistency)
- Icon per category

**PortAdapterDiagram.astro** — Port/Adapter relationship
- Props: `{ port: Port }`
- Left side: interface name (port) with dashed border
- Right side: implementation name (adapter) with solid border
- Arrow showing dependency inversion direction

## Pages

### Logbook Index (`src/pages/logbook/index.astro`)

- Queries logbook collection sorted by date descending
- For each entry, runs tests to get summary counts
- Renders vertical timeline with EntryCard components
- Header with project description

### Entry Detail (`src/pages/logbook/[id].astro`)

```astro
---
import { getCollection, render } from 'astro:content';
import { runSuites } from '../../../package/tests/runner';

// Eagerly load all artifact files at build time
const artifactModules = import.meta.glob('../data/logbook/artifacts/*.ts', { eager: true });

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

// Load artifacts — null if no artifact file exists for this entry
// Match artifact file by exact entry ID (e.g., entry-001.ts for entry-001)
const artifactKey = Object.keys(artifactModules).find(k => k.endsWith(`/${entry.id}.ts`));
const artifacts = artifactKey ? (artifactModules[artifactKey] as any).artifacts : null;

// Run tests — empty array if no testSuites specified
const testResults = entry.data.testSuites.length > 0
  ? runSuites(entry.data.testSuites)
  : [];
---
```

Four sections rendered in order:
1. **Header** — title, date, tags as pill badges
2. `<Content />` — markdown description
3. **Test results** — `TestSuiteCard` for each suite (hidden if `testResults` is empty)
4. **DDD Artifacts** — `BoundedContextMap`, `AggregateCard`, `ValueObjectCard`, `PortAdapterDiagram` (hidden if `artifacts` is null)

Navigation: breadcrumb (Home > Logbook > Entry Title) + prev/next links via `EntryNavigation`.

## File Structure

```
content.config.ts                        # Project root (Astro 6 requirement)
src/
├── data/
│   └── logbook/
│       ├── entry-001.md
│       └── artifacts/
│           └── entry-001.ts
├── pages/
│   ├── index.astro
│   └── logbook/
│       ├── index.astro
│       └── [id].astro
├── components/
│   ├── logbook/
│   │   ├── EntryCard.astro
│   │   ├── TestSuiteCard.astro
│   │   ├── TestResultRow.astro
│   │   └── EntryNavigation.astro
│   └── ddd/
│       ├── AggregateCard.astro
│       ├── ValueObjectCard.astro
│       ├── BoundedContextMap.astro
│       ├── InvariantBadge.astro
│       └── PortAdapterDiagram.astro
├── types/
│   └── logbook.ts
├── layouts/
│   └── Layout.astro
└── styles/

package/
├── tests/
│   ├── runner.ts
│   ├── inventory.tests.ts
│   ├── order.tests.ts
│   └── index.ts
└── core/
    └── ... (existing)
```

## Types File

File: `src/types/logbook.ts`

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

## Visual Design Notes

- All components use Tailwind CSS (already installed)
- No additional dependencies
- Color scheme per bounded context (e.g., Inventory = emerald, Order = blue)
- Invariant categories color-coded (business = amber, validation = blue, consistency = purple)
- Test results: green for pass, red for fail
- Responsive layout, mobile-friendly
- Dark/light mode support via Tailwind if desired later

## Migration Notes

- The existing `src/logbook/` directory (containing `components/entry.astro`) will be **removed** after migration
- The import in `src/pages/index.astro` (`import Entry from "../logbook/components/entry.astro"`) must be updated to use the new component paths or removed if the landing page no longer renders logbook entries directly
- The existing `package/tests/index.ts` will be replaced by the new test runner system

## Constraints

- Zero new dependencies (only Astro + Tailwind already in project)
- Tests execute at build time (SSG)
- Components are pure Astro (no client-side JS needed)
- Content is static — changes require rebuild
