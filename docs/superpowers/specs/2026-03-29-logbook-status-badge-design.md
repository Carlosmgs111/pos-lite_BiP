# Logbook Status Badge + Dynamic Date — Design Spec

**Date**: 2026-03-29
**Status**: Approved

## Context

Logbook entries represent ongoing sprint work in a build-in-public project. Entries need to visually communicate whether they are actively being worked on or finalized. The `date` field should reflect "today" for open entries (work in progress) and freeze to the closing date for closed entries.

## Requirements

### Dynamic Date Display

- If `closed === false`: display **build-time date** via `new Date()` — this is the date when `pnpm build` or `pnpm dev` runs, not the visitor's current date (SSG limitation)
- If `closed === true`: display the **frontmatter `date`** (the date the entry was closed)
- The frontmatter `date` field is only manually updated when closing an entry — it is NOT auto-modified
- **Date computation lives inside each component** (EntryCard and `[id].astro`), not pre-computed by the page. EntryCard receives `closed` and the original `date` props and resolves the display date internally.

### Status Badge

Pill/tag with colored background, derived from the `closed` frontmatter field:

| `closed` | Label | Style |
|----------|-------|-------|
| `false` | En progreso | `bg-emerald-100 text-emerald-700` |
| `true` | Cerrada | `bg-gray-100 text-gray-500` |

Badge size: `text-xs font-medium px-1.5 py-0.5 rounded`

### Badge Placement

**EntryCard (index page):** In the existing metadata row alongside the `<time>` element and test summary badge.

**Entry detail page (`[id].astro`):** In the header, the existing `<time>` and badge are wrapped in a `flex items-center gap-2` row, placed before the `<h1>` title.

### i18n

Add a `logbook` key to the existing `es` object in `src/i18n/es.ts`, after the `about` key:

```typescript
logbook: {
  statusOpen: "En progreso",
  statusClosed: "Cerrada",
},
```

Consumption: components import `{ t } from "../../i18n"` and access `t.logbook.statusOpen` / `t.logbook.statusClosed`. This follows the same pattern used by the hero (`t.hero.scene`, etc.).

## Files to Modify

1. **`src/i18n/es.ts`** — add `logbook` namespace with status strings
2. **`src/components/logbook/EntryCard.astro`** — add `closed` prop, status badge, dynamic date logic
3. **`src/pages/logbook/index.astro`** — pass `closed` prop to EntryCard
4. **`src/pages/logbook/[id].astro`** — add status badge and dynamic date logic

## Scope

**In scope:**
- Status badge on EntryCard and detail page
- Dynamic date display (today vs frontmatter)
- i18n strings for badge labels

**Out of scope:**
- Filtering entries by status
- Auto-updating frontmatter date on close
- Any changes to the content schema (already has `closed: z.boolean().default(false)`)

## Known Limitations

- The "today" date for open entries is the **build-time date**, not the visitor's browser date. This is inherent to SSG (Astro static build). For the date to advance, a redeploy (`pnpm build`) is needed. This is acceptable for a build-in-public project where builds happen frequently during active development.
