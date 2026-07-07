# Task 4 Report - Product & IA Migration: Rencana Ownership Move

Date: 2026-07-07
Worktree: `C:\TITIP\financeapptesting\.worktrees\product-ia-migration`
Branch: `product-ia-migration`

## Scope completed

- Added focused Plan tab tests first for the new planning ownership model.
- Added segmented `Rencana` navigation for:
  - `Goal`
  - `Budget`
  - `Tagihan`
  - `Simulasi`
- Kept `GoalsSection` under `Rencana` as the default planning owner.
- Moved budget ownership into `Rencana` by rendering `BudgetsSection` there.
- Moved bill-management ownership into `Rencana` by rendering `BillsSection` there.
- Kept future-oriented planning tools under `Rencana > Simulasi`:
  - `FITrackerCard`
  - What-if launcher
  - `DebtsSection`
  - `EventBudgetsSection`
- Removed budget ownership from `Statistik`.
- Removed bills ownership from `Profil`.
- Avoided feature-internal rewrites; this task is primarily an IA / placement move.

## Failure-state inspection

- The task prompt pointed to `C:\TITIP\financeapptesting\.worktrees\product-ia-migration\.superpowers\sdd\task-4-brief.md` as the source-of-truth brief.
- That file was not present in the worktree at execution time.
- I therefore executed against the explicit requirements supplied in the user message and validated those requirements against the existing dashboard ownership split in:
  - `src/app/dashboard/PlanTab.jsx`
  - `src/app/dashboard/StatsTab.jsx`
  - `src/app/dashboard/ProfileTab.jsx`
  - `src/app/dashboard/page.js`
- The new focused Plan tests failed first for the expected reasons:
  - no internal `Rencana` tab navigation existed
  - budgets were still owned by `Statistik`
  - bills were still owned by `Profil`
  - `Rencana` mixed summaries and planning tools instead of presenting clear owner sections

## Files changed

1. `tests/components/PlanTab.test.jsx`
   - Added focused tests for segmented `Rencana` navigation and owner placement for goals, budgets, bills, and simulation tools.

2. `src/app/dashboard/PlanTab.jsx`
   - Added local segmented navigation state.
   - Added four internal owner sections: `Goal`, `Budget`, `Tagihan`, `Simulasi`.
   - Promoted `BudgetsSection` and `BillsSection` into `Rencana`.
   - Kept `GoalsSection` as the default section.
   - Moved future-planning utilities under `Simulasi`.

3. `src/app/dashboard/StatsTab.jsx`
   - Removed `BudgetsSection` ownership from `Statistik`.
   - Kept the screen analysis-first, with event-oriented summary content remaining in `Ringkasan`.

4. `src/app/dashboard/ProfileTab.jsx`
   - Removed `BillsSection` ownership entirely.
   - Simplified props so `Profil` stays account/settings-only.

5. `src/app/dashboard/page.js`
   - Passed budget-context props and bill refresh state into `PlanTab`.
   - Stopped passing bills ownership props into `ProfileTab`.
   - Removed the no-longer-needed `handleViewBills` navigation helper.

6. `.superpowers/sdd/task-4-report.md`
   - Added this implementation report.

7. `.superpowers/sdd/progress.md`
   - Appended Task 4 completion entry.

8. `progress.md`
   - Appended this session entry per repo workflow.

## Verification

- TDD red step:
  - `npm test -- tests/components/PlanTab.test.jsx`
  - Result before implementation: failing tests
  - Expected failures: missing `Rencana` tabs, missing budget owner section, missing bill owner section, simulation tools not grouped behind `Simulasi`

- Focused green step after implementation:
  - `npm test -- tests/components/PlanTab.test.jsx`
  - Result after implementation: 1 file passed, 5 tests passed

- Adjacent focused regression verification:
  - `npm test -- tests/components/StatsTab.test.jsx`
  - Result: 1 file passed, 6 tests passed

## Outcome

Task 4 is implemented as the main planning-ownership move in the Product & IA migration: `Rencana` is now the clear destination for future-money management, `Statistik` is trimmed back toward analysis, and `Profil` is trimmed back toward account/settings responsibilities.

## Remaining concerns

- `EventBudgetsSection` still appears inside `Statistik > Ringkasan`; I left it there because the task’s explicit ownership removals only required budgets out of `Statistik` and bills out of `Profil`, and I avoided a broader rewrite without a stronger brief.
- Full-suite / build verification was not run in this task report; focused behavior verification is fresh and green for the modified areas.
