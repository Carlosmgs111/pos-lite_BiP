# Home Hero Introduction — Design Spec

**Date**: 2026-03-29
**Status**: Approved

## Context

pos-lite is a "build in public" POS project targeting underserved small businesses (PYMES, tiendas de barrio, puestos callejeros, emprendimientos). The current home page is a minimal placeholder. This spec defines a narrative hero introduction that communicates both the human purpose and the technical transparency of the project.

## Audience

Dual audience:
1. **Potential users / general public** — people who recognize the problem (small businesses running on pen and paper)
2. **Developers / technical followers** — people interested in the build-in-public process, architecture, DDD

Strategy: lead with emotional resonance (the real problem), then branch to both audiences via CTAs.

## Narrative Approach

"La escena cotidiana" — open with a universally recognizable image (the notebook, the pencil, mental math) and pivot to the project's purpose. Documentary style, no selling.

## Content Structure

### Hero Block

```
┌─────────────────────────────────────────────┐
│                                             │
│   "Un cuaderno rayado. Un lápiz.            │
│    Las cuentas de hoy sumadas de memoria."  │  ← scene (italic, light weight)
│                                             │
│   "Así funcionan miles de negocios          │
│    ahora mismo."                            │  ← bridge (medium weight)
│                                             │
│   "pos-lite se construye para ellos."       │  ← declaration (bold, larger)
│                                             │
│   subtitle: "Un sistema de punto de venta   │
│   tan ligero que cabe en tu bolsillo.       │
│   Construido en público, una iteración      │
│   a la vez."                                │  ← subtext (gray, small)
│                                             │
│   [ Conocé el proyecto ]  [ Ver bitácora ]  │  ← dual CTA
│                                             │
└─────────────────────────────────────────────┘
```

### Copy (Spanish — default locale)

| Block | Text | Style |
|-------|------|-------|
| Scene | *Un cuaderno rayado. Un lápiz. Las cuentas de hoy sumadas de memoria.* | Italic, light weight (`italic font-light`) — no serif font needed, the italic + light combo creates the tonal contrast |
| Bridge | Así funcionan miles de negocios ahora mismo. | Medium weight, neutral |
| Declaration | **pos-lite se construye para ellos.** | Bold, larger size |
| Subtext | Un sistema de punto de venta tan ligero que cabe en tu bolsillo. Construido en público, una iteración a la vez. | Small, gray, secondary |
| CTA Primary | Conocé el proyecto | Solid button → `#about` (a minimal `<section id="about">` placeholder is added below the hero with a brief "coming soon" note; will be replaced by full `/about` page later) |
| CTA Secondary | Ver bitácora | Outline/ghost button → `/logbook/` |

### Visual Design

- No images — text IS the image. Consistent with "lite" philosophy
- Centered vertically and horizontally, generous whitespace
- Progressive visual hierarchy (subtle → impactful)
- Mobile-first, single column

### i18n Readiness

- All text content extracted to a locale object in `src/i18n/es.ts`
- Structure: `{ hero: { scene, bridge, declaration, subtext, ctaPrimary, ctaSecondary } }`
- Default locale: `es`
- `src/i18n/index.ts` is a simple re-export: `export { default as t } from './es'` — no runtime locale detection (SSG build, single locale for now)
- Layout.astro receives an optional `lang` prop (default `'es'`), replacing the hardcoded `lang="en"`. Existing callers (logbook pages) need no changes since the default covers them.
- Prepared for future toggle — no toggle implemented in this iteration

## Scope (this iteration)

**In scope:**
- Hero block with all copy
- i18n content extraction (es locale only)
- Dual CTA (primary → #about anchor, secondary → /logbook/)
- Responsive/mobile-first layout

**Out of scope (future iterations):**
- `/about` page
- Language toggle UI
- Additional landing sections below hero
- English locale content

## Technical Notes

- Modify `src/pages/index.astro` — replace placeholder with hero block + `<section id="about">` placeholder
- Create `src/i18n/es.ts` — typed locale object with `hero` namespace
- Create `src/i18n/index.ts` — re-exports current locale: `export { default as t } from './es'`
- Update `src/layouts/Layout.astro` — add optional `lang?: string` prop (default `'es'`), replace hardcoded `lang="en"` with `lang={lang}`. Existing logbook pages are unaffected (default covers them).
