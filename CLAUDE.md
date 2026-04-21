# pos-lite

## Project Overview
Simple Point of Sale application built with **Astro 6**, **Tailwind CSS 4**, and **TypeScript 6**. Uses **DDD (Domain-Driven Design)** with hexagonal architecture in the core domain layer. Built in public with a logbook tracking daily progress. Includes a Live Demo at `/pos` with interactive Preact Islands. Server-side domain execution via API endpoints with SSE for real-time push.

## Tech Stack
- **Framework**: Astro 6 (hybrid — static pages + SSR API routes via `@astrojs/node`)
- **UI Islands**: Preact (~3 KB) via `@astrojs/preact`
- **State Management**: Nanostores (~300 bytes) for cross-island state
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Language**: TypeScript 6 (strict mode, `jsxImportSource: "preact"`)
- **Package Manager**: pnpm
- **Node**: >=20.0.0

## Architecture

### Frontend (`src/`) — Screaming Architecture
- `src/pages/` — Astro pages + API routes (`api/catalog/`, `api/sales/`, `api/payment/`)
- `src/pos/components/` — Preact components (.tsx) for the POS Live Demo
- `src/pos/services/` — Service layer: CatalogService, SaleService, PaymentService (HTTP-only, no domain imports)
- `src/pos/stores/` — Nanostores atoms (catalog, cart, payment, toast)
- `src/logbook/` — Logbook module (components, ddd/, data/, types/, lib/)
- `src/shared/` — Cross-module (layouts, components, i18n, styles)
- `src/content.config.ts` — Astro content collections config (must be in `src/`, NOT root)

### API Endpoints (`src/pages/api/`)
All endpoints use `export const prerender = false` for SSR.
- `api/catalog/init` — seed demo products
- `api/catalog/stock` — query product stock
- `api/sales/create`, `items`, `register`, `cancel` — sale lifecycle
- `api/payment/register`, `process`, `commit`, `webhook`, `reconcile`, `status`, `events` — payment lifecycle + SSE

### Domain Core (`package/core/`)
Hexagonal architecture with DDD patterns:
- `package/core/inventory/` — Inventory bounded context (Product aggregate, NameVO, stock management)
- `package/core/sales/` — Sales bounded context (Sale aggregate, SaleItem entity, SaleStatus state machine, domain events)
- `package/core/payment/` — Payment bounded context (**two aggregates**: PaymentOrder + Payment, external gateway integration, SSE)
- `package/core/shared/domain/` — Shared kernel (PriceVO, UuidVO, Result monad, EventBus, DomainEvent with typed EventMap)
- `package/core/shared/infrastructure/` — InMemoryEventBus, SSEStreamAdapter, subscribeWithFilter
- `package/core/shared/config/` — Composition root (eventBus instance)

### External Systems (`externals/`)
- `externals/payment-gateway/` — Mock payment processor (node:http, simulates async processing with webhook callback)

### Tests (`package/tests/`)
Custom test runner (no external test framework). Tests run as TypeScript modules during SSG build.
- `starting/` — Iteration 1: inventory, sales, shared (PriceVO)
- `iter2/` — Iteration 2: sales lifecycle, payment with events
- `iter3/` — Iteration 3: payment lifecycle (PENDING → PARTIAL → COMPLETED), async flow
- `iter4/` — Iteration 4: payment audit (cancel, failed retries, terminal state guards)

## Key Patterns
- **Value Objects**: PriceVO (stores cents internally), NameVO, UuidVO
- **Result monad**: `Result<E, T>` with `ok`/`fail` — forces caller to check `isSuccess`
- **Typed EventMap**: `DomainEvent<K extends EventName>` with `payload: EventMap[K]` — compile-time event typing
- **Event-Driven Integration**: Sales ↔ Payment via domain events (SalesReadyToPay, PaymentOrderCompleted, PaymentOrderFailed)
- **Separate Aggregates**: PaymentOrder (validates intent, accumulated state) and Payment (own lifecycle, own repo). PaymentOrder dominates creation; Payment is autonomous in confirmation.
- **Incremental State**: PaymentOrder tracks `paidAmount`, `pendingAmount`, `failedAttempts` — O(1) operations, no recomputation from Payment[]
- **External Gateway**: PaymentGateway port (requestPayment, queryStatus), HttpPaymentGateway adapter with retry/backoff
- **SSE Push**: SSEStreamAdapter for real-time events, EventListener on client, native SSE event types
- **Server-Side Execution**: All domain logic runs server-side via API endpoints. Client services use `fetch` only — zero `package/core` imports.
- **State Machines**: Sale (`DRAFT → READY_TO_PAY → COMPLETED/CANCELLED`), PaymentOrder (`PENDING ↔ PARTIAL → COMPLETED/FAILED/CANCELLED`), Payment (`PENDING → COMPLETED/FAILED`)
- **Retry Policy**: `ConfirmPayment` checks `failedAttempts >= 3` → `markAsFailed()` + event

## Commands
```bash
pnpm dev                    # Start dev server (Astro + SSR)
pnpm dev:payment-gateway    # Start mock payment gateway
pnpm build                  # Build for production
pnpm preview                # Preview production build
npx tsc --noEmit            # Type check
```

## Conventions
- Astro 6: `content.config.ts` goes in `src/`, not project root
- Value Object files use `.VO.ts` suffix
- Domain errors go in `Errors/` subdirectory per bounded context
- Infrastructure errors go in `infrastructure/Errors/` (not domain)
- Domain events go in `events/` subdirectory within the domain layer, implement `DomainEvent<K>`
- Event handlers go in `application/event-handlers/`
- Event handler names describe the action, not the event
- API endpoints: `prerender = false`, JSON responses, proper HTTP status codes
- POS services: HTTP-only, no direct domain imports
- EventListener per service context (payment has its own, sales would have its own)
- SSE endpoints: domain-scoped (e.g., `/api/payment/events`), use SSEStreamAdapter + subscribeWithFilter
- Logbook entries in `src/logbook/data/`, artifacts in `src/logbook/data/artifacts/`
- Test suites organized by iteration with unique string IDs
