# pos-lite

## Project Overview
Simple Point of Sale application built with **Astro 6**, **Tailwind CSS 4**, and **TypeScript 6**. Uses **DDD (Domain-Driven Design)** with hexagonal architecture in the core domain layer. Built in public with a logbook tracking daily progress.

## Tech Stack
- **Framework**: Astro 6 (SSG)
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Language**: TypeScript 6 (strict mode)
- **Package Manager**: pnpm
- **Node**: >=20.0.0

## Architecture

### Frontend (`src/`)
- `src/pages/` — Astro pages (index, logbook index, logbook entry detail)
- `src/components/` — Astro components (ddd visualization, logbook UI, Breadcrumb)
- `src/layouts/` — Layout templates (Layout.astro with optional `lang` prop, default `'es'`)
- `src/data/logbook/` — Logbook entries (markdown + artifact data + test snapshots)
- `src/i18n/` — i18n content (es.ts locale, index.ts barrel export)
- `src/lib/` — Utilities (resolve-tests.ts for test execution and snapshot caching)
- `src/styles/global.css` — Global styles
- `src/content.config.ts` — Astro content collections config (must be in `src/`, NOT root)
- `src/types/` — Shared TypeScript types (logbook artifacts, test summary)

### Domain Core (`package/core/`)
Hexagonal architecture with DDD patterns:
- `package/core/inventory/` — Inventory bounded context (Product aggregate, NameVO, stock management)
- `package/core/sales/` — Sales bounded context (Sale aggregate, SaleItem, SaleStatus state machine, domain events)
- `package/core/payment/` — Payment bounded context (PaymentOrder aggregate, Payment entity, PaymentMethod, event-driven creation)
- `package/core/shared/domain/` — Shared kernel (PriceVO, UuidVO, Result monad, EventBus/EventHandler interfaces)
- `package/core/shared/infrastructure/` — Shared infrastructure (InMemoryEventBus singleton)
- Ports & Adapters pattern: `application/ports/` (interfaces) → `infrastructure/` (implementations)
- In-memory repositories for persistence

### Tests (`package/tests/`)
Custom test runner (no external test framework). Tests run as TypeScript modules during SSG build.
- `runner.ts` — Suite registration and execution (Suite has `id`, `name`, `description`, optional `setup`/`teardown`)
- `starting/` — Iteration 1 suites: inventory, sales, shared (PriceVO)
- `iter2/` — Iteration 2 suites: sales lifecycle, payment with events

## Key Patterns
- **Value Objects**: PriceVO (stores cents internally, `getValue()` returns decimals, `getValueInCents()` returns cents), NameVO, UuidVO
- **Result monad**: `Result<E, T>` with `ok`/`fail` factory methods — forces caller to check `isSuccess` before accessing value
- **PriceVO**: Constructor takes dollars, converts to cents internally. Static methods: `add()`, `substract()`, `multiply()`
- **UuidVO**: Validates UUID format, normalizes to lowercase. `UuidVO.generate()` returns a string via `crypto.randomUUID()`
- **Event-Driven Integration**: Sales publishes `SalesConfirmed` → Payment subscribes via `InMemoryEventBus` → auto-creates `PaymentOrder`
- **State Machines**: Sale (DRAFT → CONFIRMED/CANCELLED), PaymentOrder (PENDING → COMPLETED/CANCELLED) — with fail-fast guards
- **Fail-Fast Validation**: Use cases check aggregate state before side effects (e.g., stock reservation)
- **Test Snapshots**: Closed logbook entries cache test results in `src/data/logbook/snapshots/`

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
- i18n: content in `src/i18n/es.ts`, consumed via `import { t } from '../i18n'`
- Logbook entries use frontmatter with `closed: boolean` to control status badge and date display
- Test suites organized by iteration (`starting/`, `iter2/`) with unique string IDs
