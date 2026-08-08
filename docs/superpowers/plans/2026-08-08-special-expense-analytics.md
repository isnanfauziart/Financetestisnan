# Special Expense Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark expense transactions as `Pengeluaran Spesial` while preserving actual accounting and excluding those expenses from routine behavioral analytics.

**Architecture:** Add one expense-only classification column, `Pengeluaran!P:P`, with a pure normalizer that maps blank or unknown values to routine. Keep the existing `monthlyData` contract as actual accounting data and add `routineMonthlyData` for behavioral consumers. Wire the classification through transaction APIs, dashboard aggregation, charts, recap, smart analytics, and reports without changing Goals, income, savings, or Supabase schemas.

**Tech Stack:** Next.js 14 App Router, React 18, JavaScript, Google Sheets API, Vitest, Testing Library, Recharts, existing Tailwind UI primitives.

## Global Constraints

- `Pengeluaran!P:P` is the only new persisted field; its header is `Sifat` and allowed values are `Rutin` and `Spesial`.
- Blank or unknown sheet values normalize to `Rutin`; new expenses default to `Rutin`.
- `monthlyData` remains actual accounting data and all actual totals, net worth, balances, budgets, quota, ledger visibility, and calendar totals include Spesial expenses.
- Routine trends, averages, anomaly alerts, forecast historical baselines, selected Health Score factors, and stable insights exclude Spesial expenses.
- The user-facing term is `Pengeluaran Spesial`; do not expose `non-rutin` in UI copy.
- Classification is manual with a non-binding suggestion; never auto-classify a transaction.
- Goals, income, savings, Supabase schema, feature flags, and external dependencies do not change.
- Preserve unrelated dirty worktree changes. Stage only files changed for this feature in each commit.
- Follow TDD: write the smallest failing test before each implementation slice and run the focused test before moving on.

---

## File Map

### New files

- `src/lib/expenseClass.js` - Pure expense-class normalization, serialization, and special-expense predicates.
- `tests/lib/expenseClass.test.js` - Unit tests for the normalization contract.

### Persistence and API files

- `src/lib/sheetManager.js` - New-sheet transaction header shape, with only Pengeluaran extended to P.
- `src/lib/sheets.js` - Idempotent lazy `Sifat` header migration helper.
- `src/app/api/transaction/route.js` - Expense create and Undo persistence.
- `src/app/api/transaction/[id]/route.js` - Expense update and delete persistence.
- `src/app/api/bills/pay/route.js` - Ensure automated expense writes remain routine and migrate the header before writing when needed.
- `src/app/api/debts/route.js` - Ensure automated expense writes remain routine and migrate the header before writing when needed.

### Dashboard and analytics files

- `src/app/api/dashboard/route.js` - Read P, normalize classes, retain actual aggregates, add routine aggregates.
- `src/lib/insights.js` - Exclude special expenses from stable weekly behavioral cards.
- `src/app/dashboard/page.js` - Pass both actual and routine data, compute UI mode data, preserve actual headline values, and show special badges in calendar day details.
- `src/lib/forecast.js` - Consume routine expense fields while accepting the existing actual field names for compatibility.
- `src/lib/healthScore.js` - Use routine expense data for approved Health Score factors and actual transactions for budget adherence.
- `src/components/AnomalyAlerts.jsx` - Exclude special expenses from current and baseline comparisons.
- `src/components/CashFlowForecast.jsx` - Display the routine-history exclusion note.
- `src/components/HealthScoreCard.jsx` - Pass routine and actual datasets.
- `src/components/SavingsRateTrend.jsx` - Use routine expense fields.

### Dashboard UI files

- `src/app/dashboard/_components/QuickAddSheet.jsx` - Expense-only special control and suggestion.
- `src/app/dashboard/WalletTab.jsx` - Keep the primary wallet form in parity with Quick Add.
- `src/app/dashboard/_components/EditTransactionModal.jsx` - Edit expense classification.
- `src/app/dashboard/_components/RecapSection.jsx` - Class filter and per-month totals.
- `src/app/dashboard/_components/RecapMonthGroup.jsx` - Special badges and actual/routine/special summary.
- `src/app/dashboard/StatsTab.jsx` - Local `Rutin | Aktual` chart mode.
- `src/app/dashboard/HomeTab.jsx` - Special badge on recent expense rows where rendered.

### Report and documentation files

- `src/lib/report.js` - Actual headline plus routine/special monthly and annual report sections.
- `src/lib/reportPdf.js` - Actual headline plus routine/special PDF sections.
- `src/components/MonthlyReportButton.jsx` - Pass routine data into monthly reports and Health Score.
- `src/components/YearInReviewButton.jsx` - Pass routine annual data into Year-in-Review.
- `AGENTS.md`, `docs/Flow-system.md`, `docs/sheets-momental.md`, `docs/commercialization-prompts.md` - Update stale A:O transaction-schema descriptions only where they describe the changed expense tab.

### Tests

- `tests/lib/sheetManager.test.js`
- `tests/lib/expenseClass.test.js`
- `tests/api/transactionRoute.test.js` - New focused transaction-create and header-migration coverage.
- `tests/api/transactionUpdate.test.js`
- `tests/api/transactionUndoRoute.test.js`
- `tests/api/dashboardHistory.test.js`
- `tests/api/debtPayment.test.js`
- `tests/api/billPayIdempotency.test.js`
- `tests/lib/insights.test.js`
- `tests/lib/healthScore.test.js`
- `tests/lib/forecast.test.js`
- `tests/lib/report.test.js`
- `tests/lib/reportPdf.test.js`
- `tests/components/QuickAddSheet.test.jsx`
- `tests/components/StatsTab.test.jsx`
- `tests/components/RecapSection.test.jsx` - New recap class filter and totals coverage.
- `tests/components/AnomalyAlerts.test.jsx` - New special-expense exclusion coverage.
- `tests/components/EditTransactionModal.test.jsx` - New class-edit payload coverage.

---

## Task 1: Add Class Normalization and Sheet Schema

**Files:**
- Create: `src/lib/expenseClass.js`
- Create: `tests/lib/expenseClass.test.js`
- Modify: `src/lib/sheetManager.js`
- Modify: `src/lib/sheets.js`
- Modify: `tests/lib/sheetManager.test.js`

**Interfaces:**
- `normalizeExpenseClass(value)` returns exactly `"routine"` or `"special"`.
- `expenseClassToSheet(value)` returns exactly `"Rutin"` or `"Spesial"`.
- `isSpecialExpense(transaction)` returns a boolean and requires `transaction.type === "expense"`.
- `ensureExpenseClassHeader(accessToken, spreadsheetId)` resolves when `Pengeluaran!P1` is blank or `Sifat`, writes `Sifat` when blank, and throws a safe conflict error for another non-empty header.

- [ ] **Step 1: Write the failing pure-helper tests**

Add tests with this behavior:

```js
import { describe, expect, it } from "vitest"
import { expenseClassToSheet, isSpecialExpense, normalizeExpenseClass } from "@/lib/expenseClass"

describe("expense class", () => {
  it("defaults blank and unknown values to routine", () => {
    expect(normalizeExpenseClass()).toBe("routine")
    expect(normalizeExpenseClass("")).toBe("routine")
    expect(normalizeExpenseClass("unexpected")).toBe("routine")
  })

  it("normalizes Spesial case-insensitively", () => {
    expect(normalizeExpenseClass(" Spesial ")).toBe("special")
    expect(expenseClassToSheet("special")).toBe("Spesial")
    expect(expenseClassToSheet("routine")).toBe("Rutin")
  })

  it("does not classify income or savings as special", () => {
    expect(isSpecialExpense({ type: "income", expenseClass: "special" })).toBe(false)
    expect(isSpecialExpense({ type: "savings", expenseClass: "special" })).toBe(false)
    expect(isSpecialExpense({ type: "expense", expenseClass: "special" })).toBe(true)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- tests/lib/expenseClass.test.js
```

Expected: FAIL because `src/lib/expenseClass.js` does not exist.

- [ ] **Step 3: Implement the pure helper**

Use the smallest implementation with these exact semantics:

```js
export const EXPENSE_CLASS_ROUTINE = "routine"
export const EXPENSE_CLASS_SPECIAL = "special"

export function normalizeExpenseClass(value) {
  return String(value || "").trim().toLowerCase() === "spesial"
    || String(value || "").trim().toLowerCase() === "special"
    ? EXPENSE_CLASS_SPECIAL
    : EXPENSE_CLASS_ROUTINE
}

export function expenseClassToSheet(value) {
  return normalizeExpenseClass(value) === EXPENSE_CLASS_SPECIAL ? "Spesial" : "Rutin"
}

export function isSpecialExpense(transaction) {
  return transaction?.type === "expense"
    && normalizeExpenseClass(transaction.expenseClass) === EXPENSE_CLASS_SPECIAL
}
```

Accept `special` as an internal value and `Spesial` as a Sheet/API value;
unknown values must remain routine.

- [ ] **Step 4: Run the pure-helper test and verify it passes**

Run the same command and expect all helper tests to pass.

- [ ] **Step 5: Extend new-sheet schema**

Replace the single common transaction header constant in `sheetManager.js`
with separate headers:

```js
const TX_HEADERS = [["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2", "EventID", "EventSubKategori"]]
const EXPENSE_HEADERS = [[...TX_HEADERS[0], "Sifat"]]
```

Keep `Pemasukan` and `Tabungan` at 15 columns. Set only the `Pengeluaran`
entry in `ALL_TABS` to `EXPENSE_HEADERS` and `cols: 16`. Ensure the existing
schema-creation test asserts these exact ranges and values.

- [ ] **Step 6: Add the lazy P1 migration helper**

Implement `ensureExpenseClassHeader()` in `src/lib/sheets.js` using existing
`getSheetData()` and `updateSheetValues()` helpers:

```js
export async function ensureExpenseClassHeader(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, "Pengeluaran!P1", spreadsheetId)
  const header = String(rows?.[0]?.[0] || "").trim()
  if (header === "Sifat") return
  if (header) throw new Error("Kolom Sifat tidak dapat dimigrasikan")
  await updateSheetValues(accessToken, "Pengeluaran!P1", [["Sifat"]], spreadsheetId, "RAW")
}
```

Do not overwrite a conflicting header. Add tests for blank, existing `Sifat`,
and conflicting header behavior using the repository's existing Sheets mocks.

- [ ] **Step 7: Run schema and helper tests**

Run:

```bash
npm run test -- tests/lib/expenseClass.test.js tests/lib/sheetManager.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit the schema slice**

```bash
git add src/lib/expenseClass.js src/lib/sheets.js src/lib/sheetManager.js tests/lib/expenseClass.test.js tests/lib/sheetManager.test.js
git commit -m "feat: add special expense class schema"
```

---

## Task 2: Persist the Class Through Transaction APIs

**Files:**
- Modify: `src/app/api/transaction/route.js`
- Modify: `src/app/api/transaction/[id]/route.js`
- Modify: `src/app/api/bills/pay/route.js`
- Modify: `src/app/api/debts/route.js`
- Modify or create: the existing transaction route tests listed in the File Map.

**Interfaces:**
- Expense create accepts `body.sifat`; missing value writes `Rutin`.
- Expense update preserves the existing class when `sifat` is omitted and replaces it when present.
- Expense row writes are A:P; income and savings remain A:O.
- Undo restores the original A:P row.

- [ ] **Step 1: Add failing API tests for expense persistence**

Add tests that assert:

```js
expect(updateCall).toHaveBeenCalledWith(
  expect.anything(),
  "Pengeluaran!A:P",
  expect.arrayContaining([[expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.any(Number), expect.anything(), expect.anything(), expect.anything(), expect.any(Number), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), "Spesial"]]),
  expect.anything(),
  "RAW"
)
```

Use focused cases for default `Rutin`, explicit `Spesial`, invalid class
rejection with HTTP 400, and header migration failure before quota reservation
or append.

- [ ] **Step 2: Run the transaction API tests and verify they fail**

Run the existing transaction route files with:

```bash
npm run test -- tests/api/transactionRoute.test.js tests/api/transactionUpdate.test.js tests/api/transactionUndoRoute.test.js
```

Expected: FAIL on the new P-range, validation, and row assertions.

- [ ] **Step 3: Update expense creation**

In `transaction/route.js`:

1. Read `sifat` from the request body.
2. Validate only `Rutin`, `Spesial`, blank, or omitted values; reject other
   non-empty values with HTTP 400.
3. Call `ensureExpenseClassHeader()` before reserving quota for an expense.
4. Add `expenseClassToSheet(sifat)` as column P for expense rows.
5. Keep income and savings row arrays at 15 cells and their existing ranges.

The expense row must end with `Rutin` or `Spesial`, and automated callers that
omit `sifat` must write `Rutin`.

- [ ] **Step 4: Update edit and delete**

In `transaction/[id]/route.js`:

1. Read existing expense data through A:P.
2. Normalize the existing P value.
3. If `sifat` is present in the PUT body, validate and use it; otherwise keep
   the existing class.
4. Write expense edits through A:P and preserve untouched columns.
5. Clear expense deletes through A:P so the undo token contains the full row.

- [ ] **Step 5: Update Undo**

In `transaction/route.js`, make the Undo path restore `Pengeluaran!A:P` for
expense tokens while retaining A:O behavior for income and savings tokens.
The restored row must be the exact original row, including P.

- [ ] **Step 6: Keep automated expense writers routine**

Before bill-pay and debt-payment expense writes, call
`ensureExpenseClassHeader()` when the destination is `Pengeluaran`. Do not add
a user-facing class parameter to those flows. Their rows end with `Rutin` for
new sheets and remain blank-but-routine only when an older direct writer has
not yet migrated the header.

- [ ] **Step 7: Run transaction API tests and verify they pass**

Run the focused transaction, bill, debt, and row-selection tests. Expected:
all focused tests pass, including unchanged income/savings A:O assertions.

- [ ] **Step 8: Commit the persistence slice**

```bash
git add src/app/api/transaction/route.js src/app/api/transaction/[id]/route.js src/app/api/bills/pay/route.js src/app/api/debts/route.js tests/api
git commit -m "feat: persist special expense classification"
```

Stage only the transaction-related test files actually changed; do not stage
unrelated existing modifications under `tests/api`.

---

## Task 3: Add Actual and Routine Dashboard Aggregates

**Files:**
- Modify: `src/app/api/dashboard/route.js`
- Modify: `src/lib/insights.js`
- Modify: `src/app/dashboard/page.js`
- Modify: `tests/api/dashboardHistory.test.js`
- Modify: `tests/lib/insights.test.js`

**Interfaces:**
- Existing `monthlyData` remains actual.
- New `routineMonthlyData` rows have exactly:

```js
{
  month,
  year,
  sortKey,
  pemasukan,
  pengeluaranRutin,
  pengeluaranSpesial,
  pengeluaranAktual,
  surplusRutin,
}
```

- Dashboard expense transactions expose `expenseClass: "routine" | "special"`.
- `selectStableInsights({ transactions })` treats special expenses as absent
  from expense ratio/category/account calculations.

- [ ] **Step 1: Write failing aggregation and insight tests**

Use two expenses in one month, one Rutin Rp1.500.000 and one Spesial
Rp10.000.000, plus Rp5.000.000 income. Assert:

```js
expect(response.monthlyData[0].pengeluaran).toBe(11500000)
expect(response.routineMonthlyData[0]).toMatchObject({
  pemasukan: 5000000,
  pengeluaranRutin: 1500000,
  pengeluaranSpesial: 10000000,
  pengeluaranAktual: 11500000,
  surplusRutin: 3500000,
})
```

Also assert a stable insight's spending ratio uses Rp1.500.000, not
Rp11.500.000, while savings and income remain unchanged.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm run test -- tests/api/dashboardHistory.test.js tests/lib/insights.test.js
```

Expected: FAIL because the route does not read P or return routine data.

- [ ] **Step 3: Extend dashboard parsing**

Change only the expense read range to `Pengeluaran!A:P`. Normalize `row[15]`
with `normalizeExpenseClass()` when pushing expense transactions. Keep income
and savings reads at A:O and keep all actual monthly, total, net-worth, and
history calculations unchanged.

Build `routineMonthlyData` while processing expense rows. For each month/year,
add every expense to `pengeluaranAktual`, add special rows only to
`pengeluaranSpesial`, and add routine rows only to `pengeluaranRutin`.
After processing income, set `surplusRutin` to income minus routine expense.
Use the same year-aware `sortKey` as actual monthly data.

- [ ] **Step 4: Filter stable insights at the shared boundary**

In `selectStableInsights()`, skip `isSpecialExpense(transaction)` before
adding an expense to `expense`, `expenseCategories`, or `expenseAccounts`.
Leave income and savings accumulation unchanged. This keeps the rule shared by
the server response and any future caller.

- [ ] **Step 5: Add client routine derivations**

In `dashboard/page.js`:

1. Keep `statExpense`, `statSurplus`, recent lists used for accounting, and
   budget/event inputs actual.
2. Derive `routineTransactions` by filtering special expenses through
   `isSpecialExpense()`.
3. Derive routine category totals and routine monthly data only where a
   client fallback needs them; prefer the server's `routineMonthlyData`.
4. Make fallback insight comparisons use routine transactions and routine
   monthly expenses.
5. Pass both actual and routine data to Stats, Forecast, Health Score, and
   report buttons.

Do not add hooks below an existing early return; place new `useMemo()` calls
with the other unconditional hook derivations.

- [ ] **Step 6: Run aggregation and insight tests**

Expected: focused dashboard and insight tests pass; existing actual totals and
history-window assertions remain unchanged.

- [ ] **Step 7: Commit the aggregate slice**

```bash
git add src/app/api/dashboard/route.js src/lib/insights.js src/app/dashboard/page.js tests/api/dashboardHistory.test.js tests/lib/insights.test.js
git commit -m "feat: expose routine expense analytics"
```

---

## Task 4: Wire Smart Analytics to Routine Data

**Files:**
- Modify: `src/components/AnomalyAlerts.jsx`
- Modify: `src/lib/forecast.js`
- Modify: `src/components/CashFlowForecast.jsx`
- Modify: `src/lib/healthScore.js`
- Modify: `src/components/HealthScoreCard.jsx`
- Modify: `src/components/SavingsRateTrend.jsx`
- Modify: `src/app/dashboard/StatsTab.jsx`
- Modify: `tests/lib/forecast.test.js`
- Modify: `tests/lib/healthScore.test.js`
- Add or modify focused tests for Anomaly and Stats behavior.

**Interfaces:**
- `computeForecast(routineMonthlyData, { transactions, bills, now })` uses
  `pengeluaranRutin` and `surplusRutin`; it still accepts old `pengeluaran`
  and `surplus` fields for callers/tests that have not been migrated yet.
- `computeHealthScore({ transactions, monthlyData, routineMonthlyData, budgets, liquidSavingsCategories })` uses routine monthly data for savings rate, emergency-fund denominator, and expense trend, while budget adherence uses actual `transactions`.

- [ ] **Step 1: Write failing smart-analytics tests**

Add cases proving a Rp10jt Spesial expense does not affect:

- Anomaly current or historical category values.
- Forecast variable expense baseline.
- Health Score savings rate and expense trend.
- Savings-rate trend series.

Also assert scheduled bills continue adding to the forecast and budget
adherence still sees the actual special expense.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm run test -- tests/lib/forecast.test.js tests/lib/healthScore.test.js
```

Expected: FAIL on the new routine-exclusion cases.

- [ ] **Step 3: Update Anomaly Alerts**

In the existing `useMemo()`, skip `isSpecialExpense(t)` before adding to
`currentSpend` or `prevSpendByMonth`. Keep the existing 30% comparison and
projection rules. The component should still show the same copy and category
filter interaction when a routine anomaly exists.

- [ ] **Step 4: Update Forecast**

Read each historical entry using:

```js
const expense = toFiniteNumber(entry?.pengeluaranRutin ?? entry?.pengeluaran)
const surplus = Number.isFinite(Number(entry?.surplusRutin))
  ? toFiniteNumber(entry.surplusRutin)
  : toFiniteNumber(entry?.surplus ?? entry?.pemasukan) - expense
```

Use `expense` for the variable baseline and `surplus` for actual chart points.
Do not remove bill-payment double-count protection or scheduled-bill addition.
Add a returned boolean or count indicating that special history was excluded,
then render one short note under the forecast formula: `Riwayat Spesial tidak
masuk baseline rutin.`

- [ ] **Step 5: Update Health Score**

Pass `routineMonthlyData` to the score function. Use it for:

- `computeSavingsRateScore()`.
- `computeEmergencyFundScore()` expense denominator.
- `computeExpenseTrendScore()` and its detail string.

Continue using actual `transactions` for `computeBudgetAdherenceScore()` and
actual savings transactions for the emergency-fund numerator. When calculating
the recursive delta, pass the corresponding routine slice rather than silently
reusing actual monthly data.

- [ ] **Step 6: Update component props and Savings Rate Trend**

Update `HealthScoreCard` and `CashFlowForecast` callers in Stats/page to pass
both datasets. Make `SavingsRateTrend` read `pengeluaranRutin` when present,
falling back to `pengeluaran` for old props.

- [ ] **Step 7: Run smart-analytics tests**

Run the focused forecast, Health Score, insights, anomaly, and component tests.
Expected: PASS, including existing legacy forecast fixtures.

- [ ] **Step 8: Commit smart analytics**

```bash
git add src/components/AnomalyAlerts.jsx src/lib/forecast.js src/components/CashFlowForecast.jsx src/lib/healthScore.js src/components/HealthScoreCard.jsx src/components/SavingsRateTrend.jsx src/app/dashboard/StatsTab.jsx tests/lib/forecast.test.js tests/lib/healthScore.test.js tests/lib/insights.test.js
git commit -m "feat: exclude special expenses from routine analytics"
```

---

## Task 5: Add Entry, Edit, Recap, and Stats UI

**Files:**
- Modify: `src/app/dashboard/_components/QuickAddSheet.jsx`
- Modify: `src/app/dashboard/WalletTab.jsx`
- Modify: `src/app/dashboard/_components/EditTransactionModal.jsx`
- Modify: `src/app/dashboard/_components/RecapSection.jsx`
- Modify: `src/app/dashboard/_components/RecapMonthGroup.jsx`
- Modify: `src/app/dashboard/StatsTab.jsx`
- Modify: `src/app/dashboard/HomeTab.jsx`
- Modify: `src/app/dashboard/page.js`
- Add or modify focused component tests.

**Interfaces:**
- Form submissions send `sifat: "Rutin" | "Spesial"` only for expenses.
- `specialSuggestion` is a boolean/value derived from recent routine data; it
  only renders an opt-in action.
- Stats local mode is `"routine" | "actual"`, defaulting to `"routine"`.

- [ ] **Step 1: Write failing UI tests**

Cover these user-visible behaviors:

```jsx
expect(screen.getByLabelText("Pengeluaran Spesial")).not.toBeChecked()
await user.click(screen.getByLabelText("Pengeluaran Spesial"))
expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ sifat: "Spesial" }))
```

Also test that the suggestion button sets the class, the income form does not
show the control, recap shows all three totals, and Stats defaults to routine
chart data while preserving the actual headline.

- [ ] **Step 2: Run focused component tests and verify failure**

```bash
npm run test -- tests/components/QuickAddSheet.test.jsx tests/components/StatsTab.test.jsx
```

Expected: FAIL on the new control, props, or text assertions.

- [ ] **Step 3: Add special state to entry forms**

Add `sifat` to the Quick Add and page Wallet form state with default `Rutin`.
Render the checkbox only when `txType === "expense"`. When toggled, update
`sifat` without changing category, amount, date, or event fields. Add the
approved helper copy below it.

Pass `specialSuggestion` into Quick Add/Wallet from the latest routine
baseline. Render `Tandai Spesial` only when the new expense meets the baseline;
the click sets `sifat` to `Spesial`, and dismissing the suggestion leaves the
class unchanged.

Reset `sifat` to `Rutin` after a successful submit and when switching to
income/savings.

- [ ] **Step 4: Add edit classification**

Initialize the edit modal from `transaction.expenseClass`, render the same
expense-only control, and include `sifat` in the PUT body. Existing expense
transactions with missing P must initialize as `Rutin`.

- [ ] **Step 5: Add Recap class filtering and totals**

Extend the Recap filter state with `class: "all" | "routine" | "special"`.
Apply it only to expenses; income and savings remain visible under the existing
type rules. For every month group, calculate:

```js
actualExpense = sum(all expense amounts)
routineExpense = sum(expenseClass !== "special")
specialExpense = sum(expenseClass === "special")
```

Render the three labels as `Aktual`, `Rutin`, and `Spesial`, and add a compact
`Spesial` badge to each special transaction row. Do not hide special rows in
the default `Semua` view.

- [ ] **Step 6: Add recent/calendar badges**

Where Home recent transactions and dashboard calendar/day details render an
expense row, add the same compact `Spesial` badge based on
`isSpecialExpense(transaction)`. Do not alter actual day totals or filtering.

- [ ] **Step 7: Add Stats mode**

Add local state initialized to `routine` and a visible `Rutin | Aktual`
segmented control. Use the selected dataset for category charts, monthly trend,
and comparison data. Leave the main actual expense headline, budgets, calendar,
and net-worth inputs actual. Use the existing selected category behavior for
both modes.

- [ ] **Step 8: Run UI tests and manual build-level checks**

Run the focused component suite. Verify the existing callback order in
`dashboard/page.js` does not introduce a `const` temporal-dead-zone dependency;
define any new callback before hooks that list it as a dependency.

- [ ] **Step 9: Commit dashboard UI**

```bash
git add src/app/dashboard/_components/QuickAddSheet.jsx src/app/dashboard/WalletTab.jsx src/app/dashboard/_components/EditTransactionModal.jsx src/app/dashboard/_components/RecapSection.jsx src/app/dashboard/_components/RecapMonthGroup.jsx src/app/dashboard/StatsTab.jsx src/app/dashboard/HomeTab.jsx src/app/dashboard/page.js tests/components
git commit -m "feat: add special expense controls and views"
```

Stage only component tests changed for this feature.

---

## Task 6: Update Monthly and Annual Reports

**Files:**
- Modify: `src/lib/report.js`
- Modify: `src/lib/reportPdf.js`
- Modify: `src/components/MonthlyReportButton.jsx`
- Modify: `src/components/YearInReviewButton.jsx`
- Modify: `tests/lib/report.test.js`
- Modify: `tests/lib/reportPdf.test.js`

**Interfaces:**
- `generateReportHTML()` accepts `routineMonthlyData` in addition to existing
  arguments.
- `generateAnnualReportHTML()` accepts `routineMonthlyData` in addition to
  existing arguments.
- `generateReportPDF()` accepts `routineMonthlyData` in its existing data
  object.

- [ ] **Step 1: Write failing report tests**

Use one routine and one special expense and assert generated HTML/PDF source
contains all of:

```text
Aktual
Rutin
Spesial
10.000.000
```

Also assert budget spent values use the actual category total, and previous
month trend comparisons use routine expense data.

- [ ] **Step 2: Run report tests and verify failure**

```bash
npm run test -- tests/lib/report.test.js tests/lib/reportPdf.test.js
```

Expected: FAIL because the reports currently show only one expense total.

- [ ] **Step 3: Add monthly report split**

Keep current `expense` as actual. Derive `routineExpense` and
`specialExpense` from the report transaction list using `isSpecialExpense()`.
Add a summary row or cards for `Aktual`, `Rutin`, and `Spesial`. Keep budget
rows based on actual category spending. Use `routineMonthlyData` to select the
previous month's routine expense for behavioral comparison.

- [ ] **Step 4: Add annual report split and special section**

Keep actual annual totals as the headline. Derive annual routine and special
totals and render a visible `Pengeluaran Spesial` section listing the largest
special purchases. Replace annual trend calculations that are intended to
describe routine behavior with `pengeluaranRutin`.

- [ ] **Step 5: Add PDF split**

Mirror the HTML report semantics in `reportPdf.js`: actual headline, routine
and special summary, visible special section, and actual budget rows. Preserve
Free watermark and existing report gating.

- [ ] **Step 6: Pass routine data from buttons**

Update monthly and annual report button props/calls so the current
classification and `routineMonthlyData` reach the report generators. Keep
existing download filenames and report gating unchanged.

- [ ] **Step 7: Run report tests and commit**

```bash
npm run test -- tests/lib/report.test.js tests/lib/reportPdf.test.js
git add src/lib/report.js src/lib/reportPdf.js src/components/MonthlyReportButton.jsx src/components/YearInReviewButton.jsx tests/lib/report.test.js tests/lib/reportPdf.test.js
git commit -m "feat: show routine and special report totals"
```

Expected: focused report tests pass before the commit.

---

## Task 7: Synchronize Documentation and Verify Integration

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/Flow-system.md`
- Modify: `docs/sheets-momental.md` only where transaction schema is described
- Modify: `docs/commercialization-prompts.md` only where transaction schema or analytics semantics are described
- Modify: `progress.md`

- [ ] **Step 1: Update stale schema references**

Document that transaction tabs remain A:O except `Pengeluaran`, which adds
P=`Sifat`; blank P means `Rutin`. Document actual-versus-routine analytics,
budget inclusion, and the user-facing `Pengeluaran Spesial` control. Do not
rewrite unrelated commercialization decisions.

- [ ] **Step 2: Run the focused feature suite**

Run the relevant API, lib, and component files together:

```bash
npm run test -- tests/lib/expenseClass.test.js tests/lib/sheetManager.test.js tests/api/transactionRoute.test.js tests/api/transactionUpdate.test.js tests/api/transactionUndoRoute.test.js tests/api/dashboardHistory.test.js tests/lib/insights.test.js tests/lib/forecast.test.js tests/lib/healthScore.test.js tests/lib/report.test.js tests/lib/reportPdf.test.js tests/components/QuickAddSheet.test.jsx tests/components/StatsTab.test.jsx
```

Expected: all focused tests pass.

- [ ] **Step 3: Run the full repository suite**

```bash
npm run test
```

Expected: exit code 0, with only the repository's already-accepted skipped
tests, if any.

- [ ] **Step 4: Run the production build**

```bash
npm run build
```

Expected: successful Next.js production build with no new warnings treated as
errors and no secrets written.

- [ ] **Step 5: Inspect the final diff and worktree**

```bash
git status --short
```

Confirm only intended feature files are in the seven feature commits and leave
pre-existing unrelated worktree changes untouched.

- [ ] **Step 6: Append the implementation milestone**

Append a dated entry to `progress.md` listing changed areas, actual/routine
decisions, focused/full/build verification results, and any genuine blocker.

- [ ] **Step 7: Commit documentation and verification record**

```bash
git add AGENTS.md docs/Flow-system.md docs/sheets-momental.md docs/commercialization-prompts.md progress.md
git commit -m "docs: document special expense analytics"
```

Only stage documentation files actually changed for this feature.

---

## Plan Self-Review

- **Spec coverage:** Persistence, lazy migration, actual/routine aggregates,
  manual UI classification, suggestion behavior, recap, Stats mode, anomaly,
  forecast, Health Score, insights, reports, compatibility, error handling,
  tests, and documentation each have a task above.
- **Completeness scan:** No incomplete markers, deferred implementation, or
  vague error-handling steps remain.
- **Type consistency:** The persisted values are `Rutin`/`Spesial`; normalized
  transaction values are `routine`/`special`; routine monthly fields are
  `pengeluaranRutin`, `pengeluaranSpesial`, `pengeluaranAktual`, and
  `surplusRutin`. These names remain consistent across tasks.
- **Minimal scope:** No Goal, income, savings, Supabase, feature-flag, or new
  dependency work is included.
