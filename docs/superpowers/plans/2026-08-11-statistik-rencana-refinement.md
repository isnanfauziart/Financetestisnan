# Statistik And Rencana Refinement Implementation Plan

> **For agentic workers:** Use the approved design spec at `docs/superpowers/specs/2026-08-11-statistik-rencana-refinement-design.md`. Implement task-by-task with focused tests. Do not commit or push unless explicitly requested.

**Goal:** Improve Statistik chart clarity, strengthen Rencana discoverability, and add first-use Utang/Piutang education.

**Architecture:** Keep existing `StatsTab`, `PlanTab`, `DebtsSection`, Recharts, `COLORS`, and `FeatureEducation` boundaries. The comparison chart consumes the already prepared `activeCompareChartData`; no API or page derivation changes are expected.

**Tech Stack:** Next.js 14, React 18, JavaScript, Tailwind CSS, Recharts, Lucide React, Vitest, Testing Library.

## Global Constraints

- No API, Google Sheets, Supabase, quota, entitlement, payment, schema, dependency, or unrelated dashboard changes.
- Preserve internal `actual`/`routine` keys and all existing financial calculations.
- Preserve existing animation and reduced-motion behavior.
- Preserve feature gates, callbacks, disabled states, focus rings, and 44px touch targets.
- Use existing DM Sans/Playfair typography and semantic tokens.

### Task 1: Statistik Charts And Summary

**Files:**
- Modify: `src/app/dashboard/StatsTab.jsx`
- Test: `tests/components/StatsTab.test.jsx`

**Steps:**

- [ ] Add failing tests for distinct category colors, expense percentages, no `Ringkasannya`, all comparison categories, two line series, horizontal overflow, and per-point labels.
- [ ] Run `npm run test -- tests/components/StatsTab.test.jsx` and confirm the new assertions fail.
- [ ] Remove `getTakeawayText`, its section, and any now-unused props.
- [ ] Calculate the active expense-category total with a zero-safe percentage formatter.
- [ ] Render expense bars with `Cell` colors from `COLORS` and reuse those colors for detail markers.
- [ ] Show `nominal · percentage` for each displayed category.
- [ ] Replace the comparison `BarChart` with a category-X-axis `LineChart` using the two selected month series.
- [ ] Keep all comparison categories, add a horizontally scrollable chart wrapper, and render both series' nominal labels at every point.
- [ ] Preserve selectors, reset, tooltip, legend, accessibility summary, and `Rutin`/`Semua` behavior.
- [ ] Run `npm run test -- tests/components/StatsTab.test.jsx` and confirm it passes.

### Task 2: Rencana And Utang/Piutang Discoverability

**Files:**
- Modify: `src/app/dashboard/PlanTab.jsx`
- Modify: `src/components/DebtsSection.jsx`
- Test: `tests/components/PlanTab.test.jsx`
- Test: `tests/components/dataSectionsErrors.test.jsx`

**Steps:**

- [ ] Add failing tests for semantic icon treatments, card top accents, visible `Buka` affordances, retained feature gates, and Utang/Piutang education.
- [ ] Run `npm run test -- tests/components/PlanTab.test.jsx tests/components/dataSectionsErrors.test.jsx` and confirm the new assertions fail.
- [ ] Add an explicit static semantic tone map for Ringkasan, Target, Anggaran, Tagihan, Utang, Event, and Simulasi.
- [ ] Apply semantic icon tiles to Rencana navigation without dynamic Tailwind class names.
- [ ] Add semantic top borders, icon tiles, `Buka` text, arrows, and pressed/focus states to Target, Anggaran, and Tagihan overview cards.
- [ ] Preserve disabled behavior, gates, section keys, callbacks, and touch targets.
- [ ] Replace the empty Utang/Piutang shortcut with `FeatureEducation` and wire `Tambah Utang/Piutang` to the existing setup modal.
- [ ] Run the two focused test files and confirm they pass.

### Task 3: Integration Verification

**Files:**
- Modify: `progress.md`

**Steps:**

- [ ] Run the combined focused suite for the changed component tests.
- [ ] Inspect mobile behavior around 375px for chart overflow, point labels, Rencana card affordance, and debt education layout.
- [ ] Dispatch one independent final diff reviewer with the complete scoped diff and acceptance criteria.
- [ ] Fix only blocking findings and rerun affected focused checks.
- [ ] Run `npm run test`.
- [ ] Run `npm run build` with process-only placeholders for absent local production variables.
- [ ] Run `git diff --check`.
- [ ] Append the completed milestone to `progress.md`.
