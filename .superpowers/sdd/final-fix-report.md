# Final Fix Report — Product & IA Migration

## Summary

Applied the final-review IA fix pass with the smallest routing/state change needed to restore ownership boundaries:

- `Beranda` urgent budget actions now route into `Rencana > Budget`
- `Beranda` urgent bill actions now route into `Rencana > Tagihan`
- `PlanTab` now supports a minimal shared section-routing contract for deep-links from `HomeTab`
- `Statistik` no longer renders `EventBudgetsSection`, so planning ownership is not duplicated

## Root cause

Review findings were accurate:

1. `HomeTab` still sent urgent budget actions to `Statistik`
2. Bill urgent actions only opened `Rencana` at its default goal view
3. `StatsTab` still owned `EventBudgetsSection` even though planning ownership had moved under `Rencana > Simulasi`

The missing piece was a tiny shared section-routing state between the dashboard shell and `PlanTab`.

## Changes made

### 1. Minimal shared plan section state

In `src/app/dashboard/page.js`:

- Added `activePlanSection` state with default `goal`
- Added `openPlanSection(sectionKey)` callback to set the section and switch to `plan`
- Passed `activeSection` and `onSectionChange` into `PlanTab`
- Reset direct bottom-nav visits to `Rencana` back to `goal` so ordinary tab entry remains predictable

### 2. Home urgent-action deep-links

In `src/app/dashboard/HomeTab.jsx`:

- Added optional `openPlanSection` prop
- Changed urgent bill CTA to open `plan` and target `tagihan`
- Changed urgent budget CTA to open `plan` and target `budget`
- Updated budget CTA copy so it no longer points users to `Statistik`

### 3. PlanTab controlled/uncontrolled section support

In `src/app/dashboard/PlanTab.jsx`:

- Extended the component to support external `activeSection` / `onSectionChange`
- Preserved local section switching through a fallback internal state
- This keeps deep-linking working without breaking ordinary in-tab navigation

### 4. Statistik ownership cleanup

In `src/app/dashboard/StatsTab.jsx`:

- Removed `EventBudgetsSection` import
- Removed its render block from the `ringkasan` section
- Removed now-unused `eventsRefreshTrigger` prop from the component signature

## Tests updated

### `tests/components/HomeTab.test.jsx`
- Added coverage for bill deep-linking to `tagihan`
- Updated budget action expectation from `stats` to `plan` + `budget`

### `tests/components/PlanTab.test.jsx`
- Added focused test proving `PlanTab` can render directly into a shared-routed section (`tagihan`)

### `tests/components/StatsTab.test.jsx`
- Added focused ownership test verifying `EventBudgetsSection` no longer renders in `Statistik`

## Verification

Command run:

```bash
npm test -- tests/components/HomeTab.test.jsx tests/components/PlanTab.test.jsx tests/components/StatsTab.test.jsx
```

Result:

- 3 test files passed
- 15/15 tests passed

## Constraints check

- `Fokus hari ini` remains on `Beranda` ✅
- 4-tab shell remains intact ✅
- `Rencana` owns budgets, bills, goals, and planning tools ✅
- `Statistik` remains analysis + reports only ✅
- Fix kept intentionally small and localized ✅
