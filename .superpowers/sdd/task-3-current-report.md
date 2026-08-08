# Task 3 Report: Routine Expense Analytics

## Scope

- Added dashboard API support for `routineMonthlyData`.
- Preserved `monthlyData` as actual accounting data.
- Exposed normalized `expenseClass` on dashboard expense transactions.
- Updated stable insights to ignore special expenses for expense ratio, category, and account calculations.
- Added page-level routine derivations for insight and analytical monthly baselines without replacing the actual dashboard data object globally.

## TDD Evidence

### RED

Command:

```powershell
npm.cmd run test -- tests/api/dashboardHistory.test.js tests/lib/insights.test.js
```

Expected failures observed:

- Dashboard aggregation test failed because expenses were still read from `Pengeluaran!A:O` instead of `Pengeluaran!A:P`.
- Insight test failed because the special expense still dominated category/account insight calculations.

### GREEN

Command:

```powershell
npm.cmd run test -- tests/api/dashboardHistory.test.js tests/lib/insights.test.js
```

Result:

- 2 test files passed.
- 6 tests passed.
- Existing Vite CJS deprecation warning remained; no test failure.

## Implementation Notes

- `src/app/api/dashboard/route.js`
  - Reads `Pengeluaran!A:P`.
  - Normalizes `row[15]` with `normalizeExpenseClass()`.
  - Adds `expenseClass` to expense transactions.
  - Keeps `monthlyData`, totals, categories, net worth, history, and accounting calculations actual.
  - Adds `routineMonthlyData` rows with:
    - `month`
    - `year`
    - `sortKey`
    - `pemasukan`
    - `pengeluaranRutin`
    - `pengeluaranSpesial`
    - `pengeluaranAktual`
    - `surplusRutin`

- `src/lib/insights.js`
  - Skips `isSpecialExpense(transaction)` before adding expense amount, expense category, or expense account values.
  - Leaves income and savings accumulation unchanged.

- `src/app/dashboard/page.js`
  - Adds unconditional hook-safe routine derivations before early returns.
  - Keeps actual `data`, `filteredTransactions`, and `allTransactions` at the Home/Stats component boundary.
  - Uses routine transactions for fallback insight comparisons and trend/category analysis derivations.
  - Uses server `routineMonthlyData` as the preferred routine monthly baseline and falls back to client derivation when absent.

## Prop Boundary Self-Review

After review, the unsafe draft boundary was corrected:

- Did not pass a routine-only `data` object to `HomeTab`.
- Did not replace `StatsTab` `filteredTransactions` or `allTransactions` with routine-only arrays.
- Preserved actual ledger/calendar/budget/report source availability through actual `data`, actual `filteredTransactions`, and actual `allTransactions`.
- Routed routine monthly baselines through the existing analytical monthly data path without expanding edits outside the Task 3 owned files.

## Files Changed

- `src/app/api/dashboard/route.js`
- `src/lib/insights.js`
- `src/app/dashboard/page.js`
- `tests/api/dashboardHistory.test.js`
- `tests/lib/insights.test.js`
- `.superpowers/sdd/task-3-current-report.md`

## Concerns

- Fully explicit `routineTransactions`/`routineMonthlyData` props inside `HomeTab` and `StatsTab` would require editing additional component files outside the original Task 3 owned-file list. This implementation preserves actual component inputs and only routes routine monthly baselines through existing owned-file boundaries.
