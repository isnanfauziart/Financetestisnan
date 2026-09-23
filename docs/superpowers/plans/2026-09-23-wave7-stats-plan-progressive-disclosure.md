# Wave 7 — Statistik and Rencana progressive disclosure

Date: 2026-09-23 · Source: `docs/2026-09-09-product-improvement-roadmap.md` → Wave 7 (line 972) · Risk: Medium

## Task contract

**Outcome:** In Statistik, users can always identify which period/filters and which analytical basis (actual-inclusive vs routine-only) produced every figure, every chart conclusion is reachable by keyboard, and overflow hints/44px targets behave correctly. In Rencana, all seven sections are discoverable and operable on narrow phones and by keyboard under a prototype-validated navigation pattern, with distinct locked/unavailable/loading/empty/failed states.

**Included**
1. **Statistik — persistent "Filter aktif" summary** covering period, account, analysis basis, category, date range, and comparison; removable filters keep their chips.
2. **Statistik — basis disclosure** (`Termasuk semua transaksi` on the hero; `Dasar: Pengeluaran rutin saja` / `Dasar: Semua transaksi` on chart surfaces) wherever actual totals and routine analytics can appear together.
3. **Statistik — ARIA completeness:** `aria-expanded`/`aria-controls` on the date-range disclosure, `aria-pressed` on the compare toggle, WAI-ARIA tabs wiring (roving tabindex, arrow keys, tabpanels).
4. **Statistik — keyboard-operable data tables** for cash flow, category ranking, monthly trend, category trend, and comparison charts via a `StatsDataTable` disclosure.
5. **Statistik — overflow-gated hint** (`Geser untuk melihat semua bulan`) via `useOverflowHint` (per-render measure + one ResizeObserver).
6. **Statistik — 44px hit areas** for calendar navigation (pseudo-element extension, visual icon unchanged).
7. **Rencana — narrow-screen navigation** decided by rendering both roadmap prototypes and shipping the winner only (decision below).
8. **Rencana — focus + announcement:** deliberate section navigation focuses the active section control (fallback: `plan-page-title`) and announces `Bagian {label} dibuka` through a polite status region.
9. **Rencana — state matrix:** section-level locked/unavailable/loading/empty/failed states verified (existing coverage in `dataSectionsErrors.test.jsx`); overview brief order (budget → bills → goals) verified unchanged.

**Exclusions:** no new endpoints, migrations, or Supabase changes; no quota/entitlement/stale-write-gate behavior changes; no Wave 8 preview-content changes; no new URL parameters; no copy changes beyond the approved strings; no React Native work.

**Protected invariants:** Wave 5 URL contract and popstate/focus behavior; Wave 6 hero and checklist; section keys; routine/actual calculation boundaries; financial-write pipelines untouched; reduced-motion and dark-mode support.

## Decision record — Rencana narrow-screen navigation

Both prototypes were rendered at 360×640 through a temporary dev-only harness (deleted after evaluation) against the roadmap's five checks:

| Criterion | Scroll rail | Lainnya |
|---|---|---|
| Mobile rendering | Pass — one labelled row, fade + hint | Pass — 3 primaries + disclosure |
| Keyboard | Pass — plain buttons; active auto-scrolls into view | Pass — disclosure + Escape restores focus |
| Focus after navigation | Pass | Pass |
| Discoverability | Pass — all 7 sections in one gesture | Weak — secondary sections hidden by default, 2 interactions |
| Overflow at 320–360px | Pass — 767px row scrolls cleanly | Pass — no overflow |

**Decision: ship the scrollable labelled rail** (with active-pill auto-scroll, edge fade, and hint). It passed all five checks, keeps every planning section permanently discoverable (the roadmap's acceptance criterion), and matches the audit's original suggestion. The `Lainnya` grouping prototype and its per-device localStorage toggle were removed after the evaluation.

## Batches (as implemented)

| Batch | Scope | Result |
|---|---|---|
| A — Statistik disclosure & basis | `StatsTab.jsx`, `tests/components/StatsTab.test.jsx` | 10 new tests; 44/44 green |
| B — Chart alternatives & targets | `StatsDataTable.jsx`, `useOverflowHint.js` (new), tabpanels/arrow keys, hints, 44px | 16 new tests; 56/56 green |
| C — Rencana prototypes + announcement | `PlanTab.jsx`, `page.js`, `globals.css`, prototype tests | 41 new tests; all green |
| D — Evaluation + decision | Rendered harness, decision recorded, losing pattern removed | toggle + loser gone; suites green |

**Verification gate:** one independent diff review → full Vitest suite → production build → `git diff --check` → `progress.md` entry.
