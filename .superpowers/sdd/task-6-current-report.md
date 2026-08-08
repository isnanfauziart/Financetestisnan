# Task 6 Report - Monthly and Annual Special Expense Reports

Date: 2026-08-08
Base commit: `49db9c8` (`fix: preserve actual report monthly data`)
Scope: report generators, report buttons, and focused report tests only.

## Implemented

- Monthly HTML and PDF reports keep the headline `Total Pengeluaran`, category totals, and budget spent values on actual expense totals, including `Spesial` expenses.
- Monthly summaries now expose `Aktual`, `Rutin`, and `Spesial` totals.
- Monthly behavioral comparison values use `routineMonthlyData` when present, with a classified-transaction fallback for callers that have not yet supplied it.
- Annual HTML keeps actual income, expense, surplus, and category accounting while using `pengeluaranRutin` for routine behavioral month, savings-rate, and daily-spend trends.
- Annual HTML includes a visible `Pengeluaran Spesial` section listing the largest special purchases.
- Monthly PDF mirrors the split and includes a visible `Pengeluaran Spesial` purchase table.
- `MonthlyReportButton` and `YearInReviewButton` pass `routineMonthlyData` to their generators and derive the same year-aware routine rows when the current caller omits the prop.
- Existing monthly PDF gating, Free watermark behavior, and filenames remain unchanged.

## TDD evidence

RED:

```text
npm.cmd run test -- tests/lib/report.test.js tests/lib/reportPdf.test.js
2 files failed; 3 tests failed, 6 tests passed.
Expected failures were the new missing Aktual/Rutin/Spesial report assertions.
```

GREEN:

```text
npm.cmd run test -- tests/lib/report.test.js tests/lib/reportPdf.test.js
2 files passed; 9 tests passed, 0 failed.
```

The first attempted RED command used `npm run test ...` and was blocked by this Windows PowerShell execution policy; the identical command was rerun with `npm.cmd`.

## Verification warnings

- Vitest reports the existing Vite CJS build deprecation warning.
- Git reports existing LF-to-CRLF working-copy warnings for touched files on Windows.
- The full repository suite, build, and unrelated component/API tests were not run because this task requested only focused report tests.
- The worktree contained unrelated dirty/deleted/untracked files before Task 6; they were preserved and not staged.

## Files changed by Task 6

- `src/lib/report.js`
- `src/lib/reportPdf.js`
- `src/components/MonthlyReportButton.jsx`
- `src/components/YearInReviewButton.jsx`
- `tests/lib/report.test.js`
- `tests/lib/reportPdf.test.js`
- `.superpowers/sdd/task-6-current-report.md`

Commit hash is recorded in the final task handoff after the allowlisted commit succeeds.
