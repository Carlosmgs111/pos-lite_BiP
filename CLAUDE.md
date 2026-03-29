# pos-lite

## Project Overview
Simple Point of Sale application built with **Astro 6**, **Tailwind CSS 4**, and **TypeScript 6**. Uses **DDD (Domain-Driven Design)** with hexagonal architecture in the core domain layer.

## Tech Stack
- **Framework**: Astro 6 (SSG/SSR)
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Language**: TypeScript 6 (strict mode)
- **Package Manager**: pnpm
- **Node**: >=22.12.0

## Architecture

### Frontend (`src/`)
- `src/pages/` — Astro pages (index, logbook)
- `src/components/` — Astro components (ddd visualization, logbook UI)
- `src/layouts/` — Layout templates
- `src/data/logbook/` — Logbook entries (markdown + artifact data)
- `src/styles/global.css` — Global styles
- `src/content.config.ts` — Astro content collections config (must be in `src/`, NOT root)
- `src/types/` — Shared TypeScript types

### Domain Core (`package/core/`)
Hexagonal architecture with DDD patterns:
- `package/core/inventory/` — Inventory bounded context (Product aggregate, Name VO)
- `package/core/order/` — Order bounded context (Order aggregate, OrderItem)
- `package/core/shared/domain/` — Shared kernel (PriceVO, Result monad)
- Ports & Adapters pattern: `application/ports/` (interfaces) → `infrastructure/` (implementations)
- In-memory repositories for persistence

### Tests (`package/tests/`)
Custom test runner (no external test framework). Tests run as TypeScript modules.
- `runner.ts` — Suite registration and execution
- `inventory.tests.ts` / `order.tests.ts` — Domain test suites

## Key Patterns
- **Value Objects**: PriceVO (stores cents internally), Name VO
- **Result monad**: `Result<E, T>` with `ok`/`fail` factory methods
- **PriceVO**: Constructor takes dollars, converts to cents. Use `PriceVO.fromCents()` for cent values.

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
