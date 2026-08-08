# Task 5: Add Entry, Edit, Recap, and Stats UI — Report

## Status

Implemented Task 5 UI for special-expense analytics.

## Scope owned

Modified only the brief-owned dashboard files plus focused component tests:

- `src/app/dashboard/_components/QuickAddSheet.jsx`
- `src/app/dashboard/WalletTab.jsx`
- `src/app/dashboard/_components/EditTransactionModal.jsx`
- `src/app/dashboard/_components/RecapSection.jsx`
- `src/app/dashboard/_components/RecapMonthGroup.jsx`
- `src/app/dashboard/StatsTab.jsx`
- `src/app/dashboard/HomeTab.jsx`
- `src/app/dashboard/page.js`
- `tests/components/QuickAddSheet.test.jsx`
- `tests/components/WalletTab.test.jsx`
- `tests/components/EditTransactionModal.test.jsx`
- `tests/components/RecapSection.test.jsx`
- `tests/components/StatsTab.test.jsx`

No report, docs, Android, build-output, or Task 6 files were edited.

## TDD record

### RED

Added focused failing UI tests first for:

- Expense-only `Pengeluaran Spesial` checkbox in Quick Add.
- Income Quick Add absence and no `sifat` payload.
- Opt-in `Tandai Spesial` suggestion and dismiss behavior.
- Wallet expense classification and income switch behavior.
- Edit modal expense classification PUT payload and income absence.
- Recap monthly `Aktual`, `Rutin`, and `Spesial` totals.
- Stats default routine analysis mode while preserving the actual headline.

Initial focused run:

```text
npm.cmd run test -- tests/components/QuickAddSheet.test.jsx tests/components/WalletTab.test.jsx tests/components/EditTransactionModal.test.jsx tests/components/RecapSection.test.jsx tests/components/StatsTab.test.jsx tests/components/HomeTab.test.jsx
```

Result: failed as expected on missing special controls, Recap totals, and Stats routine/actual mode.

### GREEN

Implemented the minimum UI/data wiring needed for the tests and brief:

- Quick Add and Wallet now keep `sifat` form state defaulted to `Rutin`.
- Expense forms render a compact accessible `Pengeluaran Spesial` checkbox with the approved helper copy:
  `Tetap masuk total dan saldo, tetapi tidak memengaruhi tren rutinitas.`
- Income forms do not render the classification control and omit `sifat` from submit payloads.
- Suggestion UI is derived from a dashboard-provided routine baseline and appears only when the current typed amount reaches the baseline threshold.
- Suggestion remains opt-in: `Tandai Spesial` sets the checkbox; dismiss hides the suggestion without changing class.
- Successful reset and type switches return classification to `Rutin`.
- Edit modal defaults missing expense class to `Rutin`, renders expense-only control, and sends `sifat` only for expense PUT requests.
- Recap supports class filter `all | routine | special`, applying the class filter only to expense rows.
- Recap month groups show `Aktual`, `Rutin`, and `Spesial` expense totals plus compact `Spesial` row badges.
- Home recent rows and dashboard calendar day details show compact `Spesial` badges without changing actual totals.
- Stats has a visible `Rutin | Aktual` mode control defaulting to `Rutin`.
- Stats mode drives expense category charts, top-category trend, monthly trend, and comparison data only.
- Actual headline, budgets/report inputs, calendar/day totals, net worth, ledger visibility, and actual transactions remain actual.

Final focused UI run:

```text
npm.cmd run test -- tests/components/QuickAddSheet.test.jsx tests/components/WalletTab.test.jsx tests/components/EditTransactionModal.test.jsx tests/components/RecapSection.test.jsx tests/components/StatsTab.test.jsx tests/components/HomeTab.test.jsx
```

Result:

```text
Test Files  6 passed (6)
Tests       37 passed (37)
```

## Build-level check

First build attempt without local placeholder env stopped at Phase 4 production env validation:

```text
Missing required production environment variables:
LEGACY_SHEET_OWNER_EMAIL,
NEXT_PUBLIC_GOOGLE_CLIENT_ID,
NEXT_PUBLIC_GOOGLE_PICKER_API_KEY,
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER
```

Reran with process-only placeholder values for those names.

```text
npm.cmd run build
```

Result:

```text
Compiled successfully
Generating static pages (12/12)
Collecting build traces
exit 0
```

The first placeholder-env build run timed out at 120s after compilation and page generation had started; the longer rerun completed successfully.

## Hook and performance notes

- New page helpers are module-level pure functions, not inline component definitions.
- New derived values are calculated from current props/state instead of stored in extra state.
- No new dependencies were added.
- Dashboard callback ordering was kept safe: no new callback is referenced before declaration in a hook dependency array.

## Behavior boundaries verified

- Actual totals remain actual for summaries, budgets/report inputs, calendar totals, day totals, net worth inputs, and ledger visibility.
- Routine mode only changes routine analytical charts/comparisons in Stats.
- Income and savings paths do not expose or submit the expense classification control.
- Suggestion is non-binding and never auto-classifies.
- User-facing copy uses `Pengeluaran Spesial`; no `non-rutin` copy was introduced.

## Concerns

- The focused test run still prints the repo's existing Vite CJS deprecation notice. React act warnings from the Task 5 harness were removed by mocking unrelated child UI where appropriate.
