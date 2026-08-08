# Special Expense Analytics Design

**Date:** 2026-08-08  
**Status:** Approved design; implementation not started

## Problem

Artami currently treats every expense as both:

1. A real cash movement that must affect the ledger, balance, net worth, and
   budgets.
2. Evidence of the user's normal spending behavior.

That produces misleading behavioral analytics when a user records a large,
infrequent purchase. For example, a normal monthly pattern of Rp1.5jt becomes
an apparent Rp11.5jt spending spike when a Rp10jt device is purchased. The
purchase should remain financially visible, but it should not redefine routine
averages, trends, forecasts, or anomaly baselines.

## Goals

- Preserve accounting truth: actual expenses remain visible and affect real
  financial calculations.
- Give users a reliable way to separate routine spending from exceptional
  purchases.
- Make routine analytics answer "what is my usual pattern?" without silently
  hiding the exceptional purchase.
- Keep the feature independent from Goals so a direct purchase can be marked
  special without first creating a Goal.
- Preserve compatibility with existing user-owned Google Sheets.

## Non-goals

- No Goal workflow or Goal schema change.
- No automatic classification that changes a user's data without consent.
- No special classification for income or savings in this version.
- No separate purchase ledger.
- No configurable thresholds or statistical classifier settings.

## Approved Decisions

| Decision | Rule |
| --- | --- |
| User-facing name | `Pengeluaran Spesial` |
| Stored expense classes | `Rutin` and `Spesial` |
| Default class | `Rutin` |
| Main total | Actual spending by default |
| Budgets | Include both Rutin and Spesial expenses |
| Net worth and balance | Include both Rutin and Spesial expenses |
| Behavioral analytics | Exclude Spesial expenses |
| Goal connection | Not required; no Goal changes |
| Classification | Manual flag, with a non-binding suggestion |
| Scope | Expense transactions only |

## User Experience

### Transaction entry

Expense forms in Wallet, Quick Add, and their equivalent edit flow receive an
unchecked `Pengeluaran Spesial` control. Its helper text is:

> Tetap masuk total dan saldo, tetapi tidak memengaruhi tren rutinitas.

The control is not shown for income or savings. New expenses without the
control are saved as `Rutin`.

After at least three eligible historical months exist, Artami may suggest the
classification when a new expense is at least as large as the median monthly
routine expense total. The suggestion offers `Tandai Spesial`, but never checks
the control automatically. If there is no sufficient baseline, no suggestion
is shown.

The suggestion baseline uses the most recent six eligible completed calendar
months, or fewer when only three to five exist. The current partial month is
excluded. Missing calendar months are not synthesized as zero. Only routine
expenses contribute to the baseline.

### Editing and transaction visibility

The edit transaction modal can change an expense between `Rutin` and
`Spesial`. Existing transaction history is recalculated from the current
classification, so changing a classification updates future and historical
views immediately.

Recent transactions, calendar detail, and recap rows keep special purchases
visible and display a compact `Spesial` badge. The transaction is never
removed from the ledger or hidden by the default view.

### Stats and recap

- The main actual expense total remains the default accounting number.
- Trend and category charts default to `Rutin`.
- Stats provides a local `Rutin | Aktual` switch for charts and trend
  comparisons. It does not change the main actual expense total.
- Monthly recap remains transaction-complete and displays `Aktual`, `Rutin`,
  and `Spesial` amounts for each month.
- Recap gains a filter with `Semua`, `Rutin`, and `Spesial` options.

The labels `Pengeluaran Spesial`, `Rutin`, and `Spesial` are used in the user
interface. The term `non-rutin` is not shown to users.

## Data Model and Persistence

### Google Sheets

Only the `Pengeluaran` tab gains a new column:

| Column | Header | Allowed values |
| --- | --- | --- |
| P | `Sifat` | `Rutin`, `Spesial` |

The existing A:O transaction columns do not change. Income and savings remain
A:O. A blank `Pengeluaran!P` cell is interpreted as `Rutin`, which makes all
existing expense history compatible without a bulk migration.

New user sheets create the `Pengeluaran` header through column P. Existing
sheets are migrated lazily when an expense is created or edited:

1. Read `Pengeluaran!P1`.
2. If it is already `Sifat`, continue.
3. If it is blank, write `Sifat` to P1.
4. If it contains a different non-empty header, stop the write and return a
   safe error instead of overwriting user data.

The migration is idempotent. Existing transaction rows are not rewritten.

### API and normalized transactions

Create and update requests accept `sifat` only for expense transactions. The
only accepted values are `Rutin` and `Spesial`; invalid values return HTTP
400. Omitted or empty `sifat` means `Rutin`.

Dashboard transaction objects expose a normalized `expenseClass` value for
expenses: `routine` or `special`. Income and savings have no special expense
classification. Parsing is case-insensitive and trims whitespace. Blank or
unknown sheet values read as `routine` so a malformed user-edited cell cannot
silently exclude money from routine analytics.

Create and update writes include column P. Delete does not need a separate
classification operation. Undo restores the complete A:P row so a special
classification cannot be lost during recovery.

Automated bill, debt, and other ledger-generated expense writes omit `sifat`
and therefore default to `Rutin`.

## Calculation Semantics

Artami maintains two analytical views from the same transaction source.

### Actual view

The existing `monthlyData` contract remains actual accounting data. Existing
totals and fields keep their meanings to avoid changing consumers:

- Total expense and surplus.
- Balance and net worth history.
- Calendar totals and transaction details.
- Budget usage and budget adherence.
- Transaction quota usage and ledger history.

All expenses, including Spesial, count in these calculations.

### Routine view

The dashboard API adds `routineMonthlyData` without changing `monthlyData`.
Each routine row has this shape:

```text
{
  month,
  year,
  sortKey,
  pemasukan,
  pengeluaranRutin,
  pengeluaranSpesial,
  pengeluaranAktual,
  surplusRutin
}
```

`pemasukan` is unchanged from the actual view. The routine expense and
special expense fields are disjoint, `pengeluaranAktual` is their sum, and
`surplusRutin` is income minus routine expense. The year-aware `sortKey` keeps
the new series aligned with `monthlyData` without reparsing rows in chart
consumers.

Routine expense excludes only expense transactions whose normalized
`expenseClass` is `special`.

The following features use the routine view:

- Routine monthly and category trends.
- Stats month-to-month and average comparisons in `Rutin` mode.
- Anomaly Alerts, excluding special expenses from both current and prior
  periods.
- Cash Flow Forecast historical expense baseline. Scheduled bills remain in
  the forecast; the forecast explains that Spesial history was excluded.
- Health Score savings rate, emergency-fund coverage denominator, and expense
  trend. Budget adherence continues to use actual expenses.
- Stable weekly insights for spending ratio and top expense category.

The following features continue using actual expenses:

- Main accounting totals.
- Net worth and balance movement.
- Monthly budgets.
- Ledger, recap visibility, calendar detail, and transaction count.

## API and Component Flow

1. The dashboard route reads `Pengeluaran!A:P`, normalizes column P, and
   creates actual and routine aggregates in one pass.
2. It returns the existing actual response fields plus routine monthly data
   and special totals needed by the UI.
3. Dashboard state passes both datasets to Stats, recap, reports, forecast,
   insights, and Health Score consumers.
4. Stats owns the local `Rutin | Aktual` chart mode; the mode does not become
   a server preference in this version.
5. Recap derives per-month actual/routine/special totals from the filtered
   transaction list, preserving its existing account, category, type, and
   date filters.
6. Reports receive the current classification and generate actual summaries
   plus routine/special breakdowns at download time.

No new database table, Supabase field, feature flag, or Goal API is needed.

## Reports

Monthly HTML/PDF reports and Year-in-Review keep actual totals as the headline
figures. They additionally show:

- Routine expense amount.
- Special expense amount.
- The special purchase list or visible special section.

Trend comparisons and routine behavioral commentary use routine expenses.
Budget adherence and actual cash movement remain actual. Re-generating a
report after reclassifying a transaction uses the latest classification; no
historical report snapshot is stored.

## Error Handling and Compatibility

- Invalid expense class input returns a validation error without writing a
  partial transaction.
- A conflicting non-empty P1 header prevents create/update rather than
  overwriting user data.
- A failed header migration prevents the associated transaction write.
- A failed transaction append/update releases any existing quota reservation,
  following current transaction error handling.
- Missing P values remain routine and do not block dashboard reads.
- If older Sheets do not yet have column P, dashboard reads still work and
  existing expenses remain routine.
- Undo and edit paths preserve all A:P values, including the classification.

## Verification Plan

Add focused tests for:

- New-sheet transaction headers include `Sifat` only on `Pengeluaran`.
- Blank and valid legacy P values normalize to routine/special correctly.
- Invalid create/update values are rejected.
- Header migration is idempotent and refuses conflicting headers.
- Create, edit, delete, and Undo preserve the classification.
- Actual aggregates include special expenses.
- Routine aggregates exclude special expenses without changing income.
- Budgets, net worth, balance, quota, and calendar totals include special
  expenses.
- Recap split and filters show all three expected modes.
- Stats routine/actual chart mode switches data without changing the actual
  headline total.
- Anomaly, forecast, insight, and Health Score calculations use their
  approved routine inputs.
- Monthly and annual reports show actual totals plus routine/special splits.
- A large expense only suggests `Spesial`; it is never auto-classified.

Run the focused Vitest tests, the full repository test suite, and
`npm run build` before implementation is considered complete.

## Acceptance Criteria

The feature is complete when a user can record a Rp10jt device purchase as
`Pengeluaran Spesial`, see the full purchase in the actual month total and
net worth, see it marked in recap/history, and still see routine analytics
reflecting the user's ordinary monthly pattern. Reclassifying the purchase to
`Rutin` must immediately restore it to routine analytics. Existing sheets and
existing transactions must continue to load without manual migration.
