# Logbook Status Badge + Dynamic Date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a status badge ("En progreso" / "Cerrada") and dynamic date display to logbook entries on both the index and detail pages.

**Architecture:** The `closed` frontmatter field (already in schema) drives both badge label and date logic. Date computation lives inside each rendering component. Badge labels come from i18n locale strings.

**Tech Stack:** Astro 6, Tailwind CSS 4, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-03-29-logbook-status-badge-design.md`

---

### Task 1: Add logbook i18n strings

**Files:**
- Modify: `src/i18n/es.ts`

- [ ] **Step 1: Add `logbook` namespace to the `es` object**

After the `about` key, add:

```typescript
  logbook: {
    statusOpen: "En progreso",
    statusClosed: "Cerrada",
  },
```

The full file should be:

```typescript
const es = {
  hero: {
    scene: "Un cuaderno rayado. Un lápiz. Las cuentas de hoy sumadas de memoria.",
    bridge: "Así funcionan miles de negocios ahora mismo.",
    declaration: "pos-lite se construye para ellos.",
    subtext: "Un sistema de punto de venta tan ligero que cabe en tu bolsillo. Construido en público, una iteración a la vez.",
    ctaPrimary: "Conocé el proyecto",
    ctaSecondary: "Ver bitácora",
  },
  about: {
    placeholder: "Próximamente: la historia completa detrás de pos-lite.",
  },
  logbook: {
    statusOpen: "En progreso",
    statusClosed: "Cerrada",
  },
} as const;

export default es;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/i18n/es.ts
git commit -m "feat: add logbook status i18n strings"
```

---

### Task 2: Add status badge and dynamic date to EntryCard

**Files:**
- Modify: `src/components/logbook/EntryCard.astro`

The current file has these Props: `id, title, date, summary, tags, testSummary`. The `<time>` element shows `dateStr` and sits in a `flex items-center gap-2` row with the test badge.

- [ ] **Step 1: Add `closed` prop and i18n import, update date logic and add badge**

The full updated file:

```astro
---
import type { TestSummary } from '../../types/logbook';
import { t } from '../../i18n';

interface Props {
  id: string;
  title: string;
  date: Date;
  summary: string;
  tags: string[];
  testSummary: TestSummary;
  closed: boolean;
}

const { id, title, date, summary, tags, testSummary, closed } = Astro.props;
const displayDate = closed ? date : new Date();
const dateStr = displayDate.toISOString().split('T')[0];
---

<a href={`/logbook/${id}/`} class="block group">
  <div class="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <time class="text-xs font-mono text-gray-400">{dateStr}</time>
          <span class={`text-xs font-medium px-1.5 py-0.5 rounded ${closed ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
            {closed ? t.logbook.statusClosed : t.logbook.statusOpen}
          </span>
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

Key changes:
- Added `import { t } from '../../i18n'`
- Added `closed: boolean` to Props
- Date logic: `const displayDate = closed ? date : new Date()`
- Status badge pill between `<time>` and test badge

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL with one new error about missing `closed` prop on `<EntryCard>` in `index.astro` — this is expected and will be resolved in Task 3. Verify no other new errors were introduced.

- [ ] **Step 3: Commit**

```bash
git add src/components/logbook/EntryCard.astro
git commit -m "feat: add status badge and dynamic date to EntryCard"
```

---

### Task 3: Pass `closed` prop from logbook index page

**Files:**
- Modify: `src/pages/logbook/index.astro`

The current `<EntryCard>` call (lines 36-43) passes `id, title, date, summary, tags, testSummary` but not `closed`.

- [ ] **Step 1: Add `closed` prop to the EntryCard call**

Change the EntryCard usage from:

```astro
        <EntryCard
          id={entry.id}
          title={entry.data.title}
          date={entry.data.date}
          summary={entry.data.summary}
          tags={entry.data.tags}
          testSummary={testSummary}
        />
```

To:

```astro
        <EntryCard
          id={entry.id}
          title={entry.data.title}
          date={entry.data.date}
          summary={entry.data.summary}
          tags={entry.data.tags}
          testSummary={testSummary}
          closed={entry.data.closed}
        />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/logbook/index.astro
git commit -m "feat: pass closed prop to EntryCard on logbook index"
```

---

### Task 4: Add status badge and dynamic date to entry detail page

**Files:**
- Modify: `src/pages/logbook/[id].astro`

The current header (lines 41-51) has `<time>` and `<h1>` stacked vertically with no flex container.

- [ ] **Step 1: Add i18n import, dynamic date logic, and badge to header**

Add the i18n import to the frontmatter. After the existing imports (line 8), add:

```typescript
import { t } from '../../i18n';
```

Replace the existing date computation (line 35):

```typescript
const dateStr = entry.data.date.toISOString().split('T')[0];
```

With:

```typescript
const displayDate = entry.data.closed ? entry.data.date : new Date();
const dateStr = displayDate.toISOString().split('T')[0];
```

Replace the header block (lines 41-51):

```astro
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
```

With:

```astro
    <header class="mb-8">
      <div class="flex items-center gap-2">
        <time class="text-sm font-mono text-gray-400">{dateStr}</time>
        <span class={`text-xs font-medium px-1.5 py-0.5 rounded ${entry.data.closed ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
          {entry.data.closed ? t.logbook.statusClosed : t.logbook.statusOpen}
        </span>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mt-1">{entry.data.title}</h1>
      {entry.data.tags.length > 0 && (
        <div class="flex flex-wrap gap-1 mt-3">
          {entry.data.tags.map((tag) => (
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
          ))}
        </div>
      )}
    </header>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no new errors

- [ ] **Step 3: Visual check — start dev server and verify**

Run: `pnpm dev`

Verify at `http://localhost:4321/logbook/`:
- Entry card shows today's date (not 2026-03-28)
- Entry card shows "En progreso" badge with green background
- Badge appears between date and test results

Verify at `http://localhost:4321/logbook/entry-001/`:
- Detail page shows today's date
- "En progreso" badge appears next to date in a flex row
- Tags still render correctly below the title

- [ ] **Step 4: Commit**

```bash
git add src/pages/logbook/[id].astro
git commit -m "feat: add status badge and dynamic date to entry detail page"
```
