# Home Hero Introduction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder home page with a narrative hero introduction that communicates the human purpose of pos-lite, with i18n-ready content extraction.

**Architecture:** Content lives in a typed locale object (`src/i18n/es.ts`), re-exported through a barrel (`src/i18n/index.ts`). Layout.astro gains an optional `lang` prop. The index page imports translations and renders the hero block with dual CTAs.

**Tech Stack:** Astro 6, Tailwind CSS 4, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-03-29-home-hero-introduction-design.md`

---

### Task 1: Create i18n locale file

**Files:**
- Create: `src/i18n/es.ts`

- [ ] **Step 1: Create `src/i18n/es.ts` with typed hero content**

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
} as const;

export default es;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors

- [ ] **Step 3: Commit**

```bash
git add src/i18n/es.ts
git commit -m "feat: add Spanish locale file with hero content"
```

---

### Task 2: Create i18n barrel export

**Files:**
- Create: `src/i18n/index.ts`

- [ ] **Step 1: Create `src/i18n/index.ts` as re-export**

```typescript
export { default as t } from "./es";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors

- [ ] **Step 3: Commit**

```bash
git add src/i18n/index.ts
git commit -m "feat: add i18n barrel export (single locale)"
```

---

### Task 3: Update Layout.astro with `lang` prop

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Add `lang` to Props interface and replace hardcoded value**

> **Note:** This intentionally changes the default `lang` from `"en"` to `"es"`. All existing pages (logbook) render Spanish content, so `"es"` is the correct value. The existing `import` lines (`global.css`, `Breadcrumb`) must remain untouched — only modify the Props interface, destructuring, and `<html>` tag.

In the frontmatter, change only the Props interface and destructuring from:

```typescript
interface Props {
  title?: string;
}

const { title = 'pos-lite' } = Astro.props;
```

To:

```typescript
interface Props {
  title?: string;
  lang?: string;
}

const { title = 'pos-lite', lang = 'es' } = Astro.props;
```

Then change the html tag from:

```html
<html lang="en">
```

To:

```html
<html lang={lang}>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. Existing callers (logbook pages) pass no `lang` prop, so the default `'es'` covers them.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add optional lang prop to Layout (default 'es')"
```

---

### Task 4: Replace index.astro with hero block

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace entire content of `src/pages/index.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import { t } from "../i18n";
---

<Layout title="pos-lite">
  <!-- Hero -->
  <section class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="max-w-2xl mx-auto text-center space-y-6">
      <p class="text-xl md:text-2xl italic font-light text-gray-600">
        {t.hero.scene}
      </p>

      <p class="text-lg md:text-xl text-gray-700">
        {t.hero.bridge}
      </p>

      <h1 class="text-3xl md:text-4xl font-bold text-gray-900">
        {t.hero.declaration}
      </h1>

      <p class="text-sm md:text-base text-gray-400 max-w-md mx-auto">
        {t.hero.subtext}
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <a
          href="#about"
          class="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {t.hero.ctaPrimary}
        </a>
        <a
          href="/logbook/"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.hero.ctaSecondary}
        </a>
      </div>
    </div>
  </section>

  <!-- About placeholder -->
  <section id="about" class="max-w-2xl mx-auto px-4 py-16 text-center">
    <p class="text-sm text-gray-400">{t.about.placeholder}</p>
  </section>
</Layout>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Visual check — start dev server and verify**

Run: `pnpm dev`

Verify in browser at `http://localhost:4321/`:
- Scene text renders italic and light
- Bridge text renders medium weight
- Declaration renders bold and large
- Subtext renders small and gray
- Both CTAs render side by side on desktop, stacked on mobile
- "Conocé el proyecto" scrolls to `#about` section
- "Ver bitácora" navigates to `/logbook/`
- Logbook pages (`/logbook/`, `/logbook/entry-001/`) still render correctly with `lang="es"`

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: replace home placeholder with narrative hero introduction"
```
