# pos-lite

## Project Overview
Simple Point of Sale application built with **Astro 6**, **Tailwind CSS 4**, and **TypeScript 6**. Uses **DDD (Domain-Driven Design)** with hexagonal architecture in the core domain layer. Built in public with a logbook tracking daily progress. Includes a Live Demo at `/pos` with interactive Preact Islands.

## Tech Stack
- **Framework**: Astro 6 (SSG)
- **UI Islands**: Preact (~3 KB) via `@astrojs/preact`
- **State Management**: Nanostores (~300 bytes) for cross-island state
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Language**: TypeScript 6 (strict mode, `jsxImportSource: "preact"`)
- **Package Manager**: pnpm
- **Node**: >=20.0.0

## Architecture

### Frontend (`src/`)
- `src/pages/` — Astro pages (index, logbook index, logbook entry detail, pos live demo)
- `src/components/` — Astro components (ddd visualization, logbook UI, Breadcrumb)
- `src/pos/components/` — Preact components (.tsx) for the POS Live Demo
- `src/pos/services/` — Service layer: CatalogService, SaleService, PaymentService
- `src/stores/` — Nanostores atoms (catalog, cart, payment, toast)
- `src/layouts/` — Layout templates (Layout.astro with optional `lang` prop, default `'es'`)
- `src/data/logbook/` — Logbook entries (markdown + artifact data + test snapshots)
- `src/i18n/` — i18n content (es.ts locale, index.ts barrel export)
- `src/lib/` — Utilities (resolve-tests.ts for test execution and snapshot caching)
- `src/styles/global.css` — Global styles + toast animation
- `src/content.config.ts` — Astro content collections config (must be in `src/`, NOT root)
- `src/types/` — Shared TypeScript types (logbook artifacts, test summary, domain events, state machines)

### Domain Core (`package/core/`)
Hexagonal architecture with DDD patterns:
- `package/core/inventory/` — Inventory bounded context (Product aggregate, NameVO, stock management with reserve/release/commit/restore)
- `package/core/sales/` — Sales bounded context (Sale aggregate, SaleItem entity, SaleStatus state machine, domain events, event handlers)
- `package/core/payment/` — Payment bounded context (PaymentOrder aggregate, Payment entity, PaymentMethod, async external processing, event-driven creation)
- `package/core/shared/domain/` — Shared kernel (PriceVO, UuidVO, Result monad, EventBus/EventHandler interfaces)
- `package/core/shared/infrastructure/` — Shared infrastructure (InMemoryEventBus singleton)
- Ports & Adapters pattern: `application/ports/` (interfaces) → `infrastructure/` (implementations)
- In-memory repositories for persistence

### Tests (`package/tests/`)
Custom test runner (no external test framework). Tests run as TypeScript modules during SSG build.
- `runner.ts` — Suite registration and execution (Suite has `id`, `name`, `description`, optional `setup`/`teardown`)
- `starting/` — Iteration 1 suites: inventory, sales, shared (PriceVO)
- `iter2/` — Iteration 2 suites: sales lifecycle, payment with events
- `iter3/` — Iteration 3 suites: payment lifecycle (PENDING → PARTIAL → COMPLETED), async flow
- `iter4/` — Iteration 4 suites: payment audit (cancel, failed retries, terminal state guards)

## Key Patterns
- **Value Objects**: PriceVO (stores cents internally, `getValue()` returns decimals, `getValueInCents()` returns cents), NameVO, UuidVO
- **Result monad**: `Result<E, T>` with `ok`/`fail` factory methods — forces caller to check `isSuccess` before accessing value
- **PriceVO**: Constructor takes dollars, converts to cents internally. Static methods: `add()`, `substract()`, `multiply()`
- **UuidVO**: Validates UUID format, normalizes to lowercase. `UuidVO.generate()` returns a string via `crypto.randomUUID()`
- **Event-Driven Integration**: Bidirectional — Sales publishes `SalesReadyToPay` → Payment creates `PaymentOrder`. Payment publishes `PaymentOrderCompleted` → Sales completes Sale. Payment publishes `PaymentOrderFailed` → Sales cancels Sale + restores stock.
- **State Machines**: Sale (`DRAFT → READY_TO_PAY → COMPLETED`, `DRAFT → CANCELLED`, `READY_TO_PAY → CANCELLED`), PaymentOrder (`PENDING ↔ PARTIAL → COMPLETED`, `PENDING/PARTIAL → FAILED/CANCELLED`), Payment (`PENDING → COMPLETED/FAILED`)
- **Async Payment Processing**: Payments created as PENDING, confirmed/failed externally via `PaymentCommit` use case
- **Fail-Fast Validation**: Use cases check aggregate state before side effects (e.g., stock reservation). `isTerminal()` guards in PaymentOrder.
- **Retry Policy**: `PaymentCommit` checks `getFailedPaymentCount() >= 3` → `markAsFailed()` + `PaymentOrderFailed` event (application-level policy, not domain)
- **Test Snapshots**: Closed logbook entries cache test results in `src/data/logbook/snapshots/`
- **Service Layer**: POS services encapsulate domain use case access + store management. Components only know services.

## Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
npx tsc --noEmit  # Type check
```

## Conventions
- Astro 6: `content.config.ts` goes in `src/`, not project root
- Value Object files use `.VO.ts` suffix
- Domain errors go in `Errors/` subdirectory per bounded context
- Infrastructure adapters implement port interfaces from `application/ports/`
- Domain events go in `events/` subdirectory within the domain layer
- Event handlers go in `application/event-handlers/`
- Event handler names describe the action, not the event (e.g., `CreatePaymentOrderOnSaleReady`, not `PaymentCompletedEventHandler`)
- i18n: content in `src/i18n/es.ts`, consumed via `import { t } from '../i18n'`
- Logbook entries use frontmatter with `closed: boolean` and optional `closedDate` for date range display
- Test suites organized by iteration (`starting/`, `iter2/`, `iter3/`, `iter4/`) with unique string IDs
- POS components are Preact `.tsx` files in `src/pos/components/`
- POS services in `src/pos/services/` — one service per bounded context
- Bounded contexts with entities span full width in artifact cards (`md:col-span-2`)
