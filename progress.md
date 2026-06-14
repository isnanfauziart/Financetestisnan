# Progress Log — Keuangan Isnan Finance Dashboard

## Session: June 4, 2026

### Updates Made
- Reviewed updated AGENTS.md file
- Created progress.md file for session tracking

### Key Additions to AGENTS.md
- Added "Additional Information" section with workflow guidance:
  - Use Skills that relate to the task/plan
  - Use subagents if the task/plan are possible
  - Create progress.md for session summaries

### Current Project Status
- **Stack**: Next.js 14.2.5, React 18, Tailwind CSS 3.4, Recharts 2.12, NextAuth v4
- **Data Source**: Google Sheets (Pemasukan, Pengeluaran, Tabungan tabs)
- **Recent Features**: Bento grid UI, Smart Insights, Click-to-filter, KPI drill-down, Account filter, Month comparison, Pull-to-refresh

### Notes
- App is in Indonesian (id locale)
- No lint/test/typecheck scripts exist
- Custom Tailwind colors: earth, sage, clay, moss, violet

## Session: June 7, 2026

### Updates Made
- Updated AGENTS.md with "Agent Workflow Rules" section
- Configured persistent subagent dispatch and progress tracking rules

### Key Additions to AGENTS.md
- Added Agent Workflow Rules section with:
  - Subagent dispatch policy (code/edit/feature work only)
  - Skills auto-loading rules
  - Progress.md tracking requirements (chronological, milestone-based)

### Configuration Decisions
- progress.md format: chronological (oldest first)
- Update trigger: end of each task/milestone
- Subagent scope: code, edit, and feature work

## Session: June 7, 2026 (Evening)

### Updates Made
- **Phase 0 — Refactor**: Split monolithic 1548-line `page.js` into tab files + shared components
  - `src/app/dashboard/_components/constants.js` (THEME, COLORS, categories, banks, months)
  - `src/app/dashboard/_components/helpers.js` (formatRp, parseTxDate, formatShortDate, useCountUp, useCountUpOvershoot, useSoundPref, playSuccessSound)
  - `src/app/dashboard/_components/SelectField.jsx` (extracted with aria-labels)
  - `src/app/dashboard/_components/CustomTooltip.jsx`
  - `src/app/dashboard/_components/PillButton.jsx`
  - `src/app/dashboard/_components/EmptyState.jsx`
  - `src/app/dashboard/_components/EditTransactionModal.jsx` (new)
  - `src/app/dashboard/HomeTab.jsx`
  - `src/app/dashboard/StatsTab.jsx`
  - `src/app/dashboard/WalletTab.jsx`
  - `src/app/dashboard/ProfileTab.jsx`
  - `src/app/dashboard/page.js` (rewritten as orchestrator shell, ~600 lines)

- **Phase 1 — Code fixes** (B1-B6):
  - B1: Added `formatShortDate` helper to fix `date.slice(0,5)` double-digit bug
  - B2: Removed hardcoded mock stats from login page
  - B3: Replaced fake "Premium" account type with "Personal"
  - B4: Moved `themeColor` to viewport export (silences build warnings)
  - B5: Added `aria-label` to ~20 icon-only buttons, `aria-hidden="true"` to decorative icons
  - B6: Increased bottom padding from `pb-32` to `pb-44` to clear nav

- **Phase 2 — Quick wins** (Q1, Q2, Q3, Q4, Q5, Q6, Q9):
  - Q1: Custom date-range filter with collapsible toggle + active filter chip
  - Q2: Skeleton loaders on Stats tab during refresh
  - Q3: Haptic feedback `navigator.vibrate(50)` on successful add
  - Q4: Animated count-up for drill-down modal "Top 10" total
  - Q5: "Today" ring on calendar heatmap cell
  - Q6: Small TypeIcon badge on insight cards (TrendingUp/AlertCircle/Info)
  - Q9: Left-border color accent on recent transactions

- **Phase 3 — H features** (H6, H8):
  - H6: Year-over-year section placeholder (existing compareMode handles current/previous year) — enhancement deferred to keep scope tight
  - H8: New insight pattern "Spending X% di atas/di bawah rata-rata" (auto-generated when specific month is selected)

- **Phase 4 — Polish** (P4, P7, P8, P9):
  - P4: Animated gradient bar at bottom of header (mesh-aurora + animate-gradient)
  - P7: `useCountUpOvershoot` hook for hero tile (sharper curve + 1.08x bounce)
  - P8: Background parallax on scroll (`translateY(scrollY * -0.15)`)
  - P9: Web Audio API "ka-ching" (880Hz + 1320Hz tones) on success, toggleable in Profile

- **Phase 5 — H2 Edit/Delete transactions**:
  - New `src/app/api/transaction/[id]/route.js` with PUT (update row) and DELETE (clear row) handlers
  - `EditTransactionModal` component with pre-filled form
  - Edit/Delete buttons in drill-down modal (hover to reveal)
  - `rowIndex` field added to all transactions in `/api/dashboard`
  - `confirm()` dialog for delete safety

### Files Changed
- Created: 11 new files (components, tabs, API route)
- Modified: 4 files (page.js, layout.js, page.js login, api/dashboard/route.js)

### Verification
- Build status: pending (about to run)

### Notes
- All changes preserve existing behavior
- Sound effect uses Web Audio API (no audio file needed)
- Edit/Delete strategy: clear row contents in Sheets (leaves empty rows but no API quota issues)
- Refactor: state lives in main `page.js` shell, passed as props to tabs (no Context needed for this size)

### Discovered Global Subagents
- Found 29 additional global subagents in `~/.config/opencode/agents/`
- They were not previously documented in AGENTS.md
- Categories: Architecture, Backend, Frontend, Mobile, Data, Quality, Domain, Research, Workflow

## Session: June 7, 2026 (continued — milestone: expanded subagent list)

### Updates Made
- Expanded subagent guide in AGENTS.md with all 29 global subagents from `~/.config/opencode/agents/`
- Organized subagents into 9 domain categories with descriptions
- Updated source note: dispatch from both `.agents/` and global `~/.config/opencode/agents/`

### Key Details
- 36 total subagents now documented (7 project + 29 global)
- 7 project-level override the global versions with same name
- Global path: `C:\Users\acer\.config\opencode/agents/`

## Session: June 7, 2026 (continued — Vercel hard refresh crash fix)

### Problem
Vercel deployment showed "Application error: a client-side exception has occurred" on hard refresh of `/dashboard`. Browser console revealed `Minified React error #310` ("Rendered fewer hooks than expected. This can be caused by an accidental early return statement.").

### Root Cause
During the Phase 0 refactor, hooks (`useMemo` for `filteredTransactions` and `insights`) were left **after** the early returns (`if (status === "loading")` and `if (error)`) in `src/app/dashboard/page.js`. On the first render (loading=true), React called N hooks, then returned the loading spinner. On the second render (data loaded), React called N+2 hooks (the 2 useMemos were now reached). Different hook count → React error #310 → entire tree crashes.

This is the same class of bug mentioned in AGENTS.md "Hooks order fix" — it got re-introduced during the refactor.

### Why local `npm run dev` worked
Dev mode logs a warning but the page still renders. Production minified build crashes hard. The build also never crashed because `next build` only compiles, doesn't execute. The user had to test with `next start` or in the Vercel deployment.

### Fix Applied
- Moved the hooks block (`isAllMonths`, `isAllYears`, `isAllAccounts`, `hasDateRange`, `useMemo filteredTransactions`, `statIncome/statExpense/statSavings/statSurplus`, `useMemo expenseCategories`, `useMemo incomeCategories`, `useMemo insights`) to before the early returns, right after the last `useCallback` (`handleTouchEnd`)
- Removed the duplicate inline computations that were after the early returns
- Wrapped `expenseCategories` and `incomeCategories` in `useMemo` (was inline previously) so the `insights` useMemo dependency array is correct
- Kept non-hook derivations (`clientMonthlyData`, `availableYears`, `availableAccounts`, `getMonthData`, `compareDataA/B`, `compareChartData`, `top5Categories`, `trendData`, `expenseRatio`, `gaugeAngle`, `gaugeColor`, calendar logic, `topCategory`, `recent5`, etc.) at their original positions after the early returns — they only need to run on the "loaded" path

### Verification
- `npm run build` passes cleanly
- Bundle size unchanged: 129 kB → 129 kB
- All 6 routes generate successfully
- The 2 `useMemo`s handle `data === null` gracefully via `(data?.transactions || [])` so the loading render doesn't crash

### Files Changed
- `src/app/dashboard/page.js` — hooks block moved up, duplicate useMemos removed

### Bonus Observations (not fixed)
- `favicon.ico` 404 in console
- `icon-192.png` 404 in console (referenced by `public/manifest.json` but doesn't exist)
  - Easy follow-up: add `public/icon-192.png` or remove from manifest

## Session: June 14, 2026

### Updates Made
- **Monthly Recap section** on Stats tab — per-month collapsible groups with edit/delete/pagination
  - Replaced the existing "Annual Overview / Monthly Breakdown" table block (which had no edit, no pagination, and only showed 15 tx for one month)
  - New self-contained filter bar (month / year / account / category dropdowns + type pill row) **independent from the top filter bar** (which still drives charts/insights/comparison/calendar)
  - 10-tx-per-page numbered pager, per month, with state preserved across re-fetches (clamped to new max after delete)
  - Edit/Delete buttons always visible on mobile (replaces hover-only pattern from DrillDownModal)
  - First month expanded by default; rest collapsed. User choice persists per month key
  - Header summary chips per group: Income / Expense / Savings / Net (color-coded)
  - 3-dot type indicator on collapsed headers shows at a glance which types have tx in that month
  - Sort: `date desc` (newest first), hardcoded for v1; sort toggle deferred to v1.1

### Files Changed
- **Created**:
  - `src/app/dashboard/_components/ConfirmSheet.jsx` — polished bottom-sheet confirm modal (replaces `window.confirm` for delete)
  - `src/app/dashboard/_components/RecapMonthGroup.jsx` — single month group (header, summary chips, row list, pager)
  - `src/app/dashboard/_components/RecapSection.jsx` — orchestrator (filter, grouping, empty/loading states)
- **Modified**:
  - `src/app/dashboard/StatsTab.jsx` — replaced overview table block with `<RecapSection>`; added 2 props (`onEditTx`, `onDeleteTx`); removed now-unused `formatShortDate` + `parseTxDate` imports
  - `src/app/dashboard/page.js` — added `deleteConfirmTx` + `deletingTx` state; refactored `handleDelete` to set state; new `performDelete` async; new `handleEditTx` wrapper that clears confirm-on-edit (so the home tab drill-down flow uses the same path); rendered `<ConfirmSheet>` next to other modals; passed 2 new props to StatsTab; DrillDownModal now uses `handleEditTx` (was `setEditingTx`)

### Key Decisions
- **Recap filter is fully independent** from the top bar (per user's explicit instruction). Top bar month/year/account/category/date does NOT affect recap; recap has its own copies of the same dimensions + a type segmented control on top.
- **Pagination keyed by month-year string** (e.g. `"Jan 2026"`), not array index. Survives delete/re-fetch, gets clamped to new totalPages automatically.
- **Goal celebration trigger preserved** in the delete path (`setGoalsRefreshTrigger(t => t + 1)`) — moved from old `handleDelete` to new `performDelete`.
- **No `window.confirm` left in the delete path.** Both the home tab drill-down and the recap now route through the same `ConfirmSheet`. (The `confirm()` import in `EditTransactionModal` was checked — doesn't exist there; the only `confirm()` was in the old `handleDelete`, which I removed.)
- **Sort toggle (date ↔ amount) deferred to v1.1** to keep v1 tight. The data layer in `RecapSection` already groups + sorts inside `useMemo`, so adding a toggle is a 3-line change.
- **Bulk select / bulk delete deferred to v2** (as agreed during planning).

### Edge Cases Handled
- 0 transactions total → `EmptyState` with hint
- Filter returns 0 → "Tidak ada transaksi yang cocok dengan filter" + Reset button
- Delete shrinks month below current page → `safePage = min(page, totalPages)` clamps
- User opens ConfirmSheet, then taps edit on a different row → `handleEditTx` clears the confirm first
- Goal celebration fires correctly for both `handleEditSave` AND `performDelete`

### Verification
- `npm run build` passes (dashboard bundle 129 kB → 141 kB, +12 kB for the recap)
- `npm run dev` boots in 3.7s, no compile/runtime errors

### Files NOT Changed (intentionally)
- `src/app/api/transaction/[id]/route.js` — PUT/DELETE endpoints already worked
- `src/app/api/dashboard/route.js` — already returns all needed fields (`id`, `rowIndex`, `type`, `account`, `date`, `category`, `desc`, `amount`, `month`, `year`)
- `EditTransactionModal` — reused as-is
- `SelectField`, `PillButton`, `EmptyState`, `helpers` — all reused as-is
- Top filter bar / charts / insights / comparison / calendar — untouched

### Follow-ups (not in v1)
- v1.1: Sort toggle (date ↔ amount) in recap filter bar
- v1.1: `RecapRow` could be a separate component if it grows
- v2: Bulk select + batch delete (long-press or checkbox mode)
- Unrelated bonus from previous session: still TODO — `favicon.ico` + `icon-192.png` 404s

## Session: June 7, 2026 (continued — Net Worth refactor)

### Goal
Rename the hero "Total Balance" card to "Net Worth" (showing cumulative savings from `Tabungan`), and remove the existing full-width NetWorthCard section that was showing a different (more complex) calculation.

### Changes Applied
- **`src/app/dashboard/HomeTab.jsx`** (5 edits):
  - Removed `import NetWorthCard from "@/components/NetWorthCard"` (no longer needed)
  - Removed unused local vars `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory`
  - Changed hero value source: `data?.totalSurplus` → `data?.totalSavings` (cumulative savings)
  - Renamed hero label: "Total Balance" → "Net Worth"
  - Removed the small `Savings` bento tile (was `bg-moss-50`, PiggyBank icon) — now duplicates the hero
  - Removed the full-width NetWorthCard section below the bento grid
  - Updated stale comment: "Hero — Total Balance" → "Hero — Net Worth"
- **`src/components/NetWorthCard.jsx`**: Deleted the file (no longer imported anywhere)
- **`src/app/api/dashboard/route.js`**: No changes (API still returns `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory` for future use)

### Result
- Bento grid: 5 small tiles + hero (2×2) = 8 cells. Bottom-right cell intentionally left empty (user plans to add a future metric there)
- Bundle size: 129 kB → 132 kB
- Build passes cleanly

### Visual Result
- Hero card now labeled "Net Worth" and shows cumulative `totalSavings` (sum of all `Tabungan` transactions)
- Income/Expense sub-pills inside hero kept (still showing current month values)
- No more full-width NetWorthCard below the bento grid
- One empty bento slot in bottom-right (intentional)

## Session: June 7, 2026 (Phase A — Goals: Budgets + Net Worth)

### Updates Made
- **G1 Per-Category Budgets** shipped end-to-end (data layer + UI):
  - New `Budgets` Google Sheets tab (schema documented in `docs/sheets-budgets.md`)
  - `src/app/api/budgets/route.js` — `GET ?month&year`, `POST`, `PUT`, `DELETE` with composite-key find (Kategori|Bulan|Tahun|Akun)
  - `src/components/BudgetProgressBar.jsx` — 4-tier color (sage < 70%, amber 70-90%, clay 90-100%, rose ≥ 100%)
  - `src/components/BudgetCard.jsx` — category/account/limit/spent card with hover edit/delete
  - `src/components/BudgetSetupModal.jsx` — create/edit form (category/month/year/limit/account/note)
  - `src/components/BudgetDetailModal.jsx` — drill-down view (all transactions for that category+month)
  - `src/components/BudgetsSection.jsx` — STATS tab section between hero and trend chart
  - G6 light suggestion: "Saran budget" pills on unbudgeted categories from `expenseCategories`
- **G4 Net Worth (lite)** shipped:
  - `/api/dashboard` adds `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory`
  - Formula: `(Income − Expense) + Savings` accumulated chronologically (year+month sort)
  - `src/components/NetWorthCard.jsx` — full-width bento-tile below the bento grid on HOME; big animated number + monthly delta + 12-month mini sparkline + help-tooltip explaining the formula
- **Filter chain**: budget cards respect year+month+account filter (account-less + matching — YNAB-style). Spent is computed from `filteredTransactions`.

### Key Decisions
- **Per-month records** (user chose this over templates+overrides — accepts the friction, mitigated with "Saran budget" pills)
- **Account-less + matching account** for account filter
- **Big number + monthly delta** for Net Worth
- **Filtered KPI drill-down modal** for budget tap (reuses existing visual pattern)
- Net Worth card placed as full-width sibling to the bento grid (chart needs more room than 110px row)

### Files Changed
- New: 7 files (`docs/sheets-budgets.md`, `src/app/api/budgets/route.js`, 5 components in `src/components/`, 1 detail modal)
- Modified: 3 files (`src/app/api/dashboard/route.js`, `src/app/dashboard/HomeTab.jsx`, `src/app/dashboard/StatsTab.jsx`, `src/app/dashboard/page.js` — 4 actually)

### Verification
- `npm run build` passes cleanly
- Bundle size: 129 kB → 133 kB (+4 kB for the new components)
- All 7 routes generate successfully
- Net worth derived client-side from existing transaction data (no extra Sheets call)

### Notes
- Phase A deliberately skips: goals tab (Phase B), explicit assets (G4 full), spending alerts (G3), recap/sharing (G7/G8)
- Next: Phase B (Savings Goals + G5 celebration + auto-link to Tabungan by category)

## Session: June 7, 2026 (Phase B — Goals: Savings Goals + Celebration)

### Updates Made
- **Goals Google Sheets tab schema** documented in `docs/sheets-goals.md` (ID | Nama | Target | Deadline | Kategori | Icon | Color | CreatedAt)
- **New API**: `src/app/api/goals/route.js` — `GET`, `POST`, `PUT`, `DELETE` with rowIndex-based find; auto-generates ID and CreatedAt on POST
- **6 new components in `src/components/`**:
  - `GoalProgressRing.jsx` — animated SVG ring with `useCountUp` percentage, supports completed state (gold ring)
  - `GoalSetupModal.jsx` — create/edit form with live preview, 17 Lucide icon options, 7 color swatches
  - `GoalContributeModal.jsx` — quick-add form that posts to `/api/transaction` with `type: "savings"` and pre-filled `kategori`
  - `GoalCelebration.jsx` — dynamic-imported `canvas-confetti` + gold-accented toast + `navigator.vibrate([50,30,50])`
  - `GoalCard.jsx` — glass card with ring, name, progress text, ETA, deadline, +Kontribusi button, hover edit/delete
  - `GoalsSection.jsx` — orchestrator: fetches goals, computes progress from transactions, header + grid + empty state + confirm-delete
- **Shared helper**: `src/app/dashboard/_components/goalUtils.js` with `parseDateLoose`, `computeGoalProgress`, `computeAllGoalProgress`
- **HOME wiring**: `GoalsSection` rendered at top of HOME tab (above bento grid)
- **Celebration detection in `page.js`**:
  - `prevGoalPctRef` ref tracks each goal's last-known progress %
  - `checkGoalCelebration()` callback fetches goals + computes current % + compares to ref
  - If `prev < 100% && current >= 100%` → set `goalCelebration` state → render `<GoalCelebration>` with confetti + toast + haptic
  - Triggered after: WALLET submit (savings only), edit transaction, delete transaction
  - 800ms delay to let `/api/dashboard` refetch complete first
- **Goals refresh trigger**: `goalsRefreshTrigger` state increments after WALLET/edit/delete to force `GoalsSection` to re-fetch its goals list

### Defaults Applied
- **Completed goals**: stay visible with "✓ Selesai" badge + gold ring (no auto-archive)
- **No initial contribution**: goals start at 0% (creator adds via +Kontribusi or via regular WALLET tabungan)
- **ETA fallback**: shows "Belum ada kontribusi" when dailyRate is 0
- **First-time-100% trigger**: only fires on the exact crossing from `<100%` to `>=100%`; subsequent saves past 100% don't re-fire

### Files Changed
- New: 9 files (`docs/sheets-goals.md`, `src/app/api/goals/route.js`, 6 components, `src/app/dashboard/_components/goalUtils.js`)
- Modified: 3 files (`src/app/dashboard/page.js`, `src/app/dashboard/HomeTab.jsx`, `src/app/dashboard/StatsTab.jsx`)

### Verification
- `npm run build` passes cleanly
- Bundle size: 133 kB → 138 kB (+5 kB for goal components and confetti dynamic chunk)
- All 8 routes generate successfully (new `/api/goals` added)

### Notes
- `canvas-confetti` added as dependency (~9KB, dynamic-imported on celebration)
- `selectEmptyOption` semantics for goal icon/color: defaults to "Target" icon + moss green
- Goals section accepts `refreshTrigger` prop to re-fetch on data changes (parent-controlled)
- Confirmation modal for goal delete (separate from the inline edit/delete on card)

## Session: June 7, 2026 (continued — #REF! parsing fix)

### Problem
User reported Net Worth displayed `Rp 7.348.000` but their `Tabungan` sheet formula `=SUM(E7:E)` returned `7.848.000` — a 500,000 discrepancy.

### Root Cause
- `Tabungan` sheet has broken `#REF!` formulas in column I (`PENGELUARAN BERSIH` / "Net")
- API used pattern `parseRupiah(row[8] || row[4] || 0)` to read amount
- `"#REF!"` is a **truthy** string, so the `||` operator did NOT fall through to column E (Jumlah)
- `parseRupiah("#REF!")` stripped non-numeric chars → `parseFloat("REF")` = `NaN` → returned 0
- The `if (amount > 0)` filter then silently dropped the entire row from totals
- Bug existed in all three parsers (income, expense, savings) — only manifested when a tab had `#REF!` errors

### Fix Applied
- `src/app/api/dashboard/route.js` — added `pickAmount(row, netIdx, grossIdx)` helper that:
  - Detects error values (`#REF!`, `#VALUE!`, `#DIV/0!`, `#N/A`, `#NAME?`, `#NULL!`, `#NUM!`) by checking if the cell value starts with `#`
  - Falls through to column E (Jumlah) when column I is broken or empty
  - Preserves existing behavior when column I has a valid number
- Replaced all 3 call sites in income/expense/savings parsers with `pickAmount(row)`
- API is now robust to broken sheet formulas — the user does not need to fix the `#REF!` errors in the sheet for the dashboard to show correct totals (though cleaning the sheet is still recommended)

### Verification
- `npm run build` passes cleanly
- Bundle size unchanged (138 kB)
- All 8 routes generate successfully
- Expected result: Net Worth now displays `Rp 7.848.000` matching the sheet

### Notes
- Sheet cleanup is recommended but not required: user can either delete column I contents or fix the formulas to `=E7`, `=E8`, etc.
- Same protection now applies to all 3 transaction parsers, so future `#REF!` errors in any tab won't cause silent data loss

## Session: June 7, 2026 (continued — append→find-empty-row + pickAmount hardening)

### Problem
After the `#REF!` fix, user reported Net Worth still wrong:
- Sheet `=SUM(E7:E)` = 7,848,000 (correct)
- Dashboard Net Worth = 7,920,026 (off by 72,026)
- New transaction added via web app landed at row 9996 instead of row 17
- A second test transaction landed at row 9997 with data scattered into wrong columns (e.g. 5jt in column Q)

### Root Cause
**Two separate bugs:**

**Bug A — `pickAmount` accepts dates:**
The previous fix only rejected strings starting with `#`. A cell containing `"7 Jun 2026"` (a misplaced date in column I) passed the check, then `parseRupiah("7 Jun 2026")` stripped non-digits to get `"72026"` (7 concatenated with 2026). Returned 72,026 as a fake "amount" → 72,026 ghost contribution to totals.

**Bug B — `:append` writes to Sheets-detected table end, not data end:**
Google Sheets' `values.append` with `insertDataOption=INSERT_ROWS` finds the table end based on formatting/structure, not actual data. The user's `Tabungan` sheet has formatted empty rows with dropdowns extending to ~row 9995, so Sheets' detected table end is row 9996 — way below the actual data at rows 7-16. The new transaction was inserted there. A second transaction got pushed to row 9997, with the date string in column I being re-interpreted as a date by `USER_ENTERED`, displacing other values into wrong columns (Q).

### Fix Applied
- **`src/app/api/dashboard/route.js` — hardened `pickAmount`:**
  - Replaced `isErr` (only catches `#`-prefixed strings) with `isNumeric` (regex `/^-?[\d.,]+$/`)
  - Now rejects dates (`"7 Jun 2026"`), text, and any string with non-numeric characters
  - Falls through to column E (Jumlah) for any non-numeric column I value

- **`src/app/api/transaction/route.js` — rewrote POST to use find-empty + update:**
  - Added `sheetsUpdate(accessToken, range, values)` helper using `values.update` (PUT)
  - Added `findNextEmptyRow(accessToken, sheetName)` — reads column A, finds last row with content, returns `lastRow + 2`
  - Replaced `appendToSheet` call with two-step: find empty row, then update specific range
  - Response now includes `rowIndex` so the frontend can show it
  - Bypasses Sheets' table-end detection entirely; works correctly even with formatted empty rows

- **`src/app/dashboard/page.js` — show row in success toast:**
  - Toast now reads `"Transaksi berhasil disimpan! ✓ · baris 17"` when API returns `rowIndex`
  - Useful for confirming the fix worked; helps user verify transactions land in the right place

### Cleanup Steps Required (user to do in Sheets UI)
- Delete rows 9996 and 9997 in the `Tabungan` tab (the misplaced test entries)
- Re-add the 500rb and 5jt savings transactions via the fixed web app → they will land at rows 17 and 18
- Sheet should now show `=SUM(E7:E)` matching the dashboard Net Worth exactly

### Verification
- `npm run build` passes cleanly
- Bundle size unchanged (138 kB)
- All 8 routes generate successfully
- After cleanup, expected Net Worth = 7,848,000 + 500,000 + 5,000,000 = 13,348,000

### Notes
- Race condition: two concurrent POSTs could pick the same `targetRow`. Last-write-wins. Acceptable for single-user app.
- Same find-empty + update pattern could be applied to the PUT/DELETE in `/api/transaction/[id]/route.js` if the user ever has data gaps in the middle of the sheet (currently they don't).
- The previous `appendToSheet` helper is no longer used and was removed (replaced by `sheetsUpdate`).


## Session: June 7, 2026 (continued — move Goals section + fix prop bug)

### Changes Applied
- **`src/app/dashboard/HomeTab.jsx`** (3 edits):
  - Removed `<GoalsSection>` from top of Overview tab (was lines 26-30)
  - Inserted `<GoalsSection>` between Spending Ratio gauge and Recent transactions
  - Fixed prop name mismatch bug: `onRefresh={onGoalsRefresh}` → `refreshTrigger={onGoalsRefresh}` (the prop name that `GoalsSection` actually destructures on line 11 of `GoalsSection.jsx`)

### New Order on Overview Tab
1. Bento grid (Hero + 5 small tiles)
2. Smart Insights
3. Spending Ratio gauge
4. **Goals** ← moved here
5. Recent transactions

### Bug Fix Detail
The prop name mismatch meant `page.js`'s `goalsRefreshTrigger` state increment (after wallet submit, edit, or delete) was not triggering `GoalsSection` to refetch. The section still worked because it refetches on its own internal modal-close callbacks, but external triggers were silently ignored. Now fixed.

### Verification
- `npm run build` passes (138 kB)
- GoalsSection now receives `refreshTrigger` correctly

## Session: June 7, 2026 (continued — remove Overview insights)

### Goal
Remove the Smart Insights section from the Overview tab. The Statistics page already has its own (compact) insights, so the Overview copy was redundant.

### Changes Applied
- **`src/app/dashboard/HomeTab.jsx`** (3 edits):
  - Removed entire Smart Insights JSX block (was lines 121-168)
  - Removed `insights,` from props destructuring
  - Removed unused lucide-react imports: `Lightbulb`, `AlertCircle`, `Info`, `TrendingUp` (only used in the deleted block)
- **`src/app/dashboard/page.js`** (1 edit):
  - Removed `insights={insights}` from `<HomeTab>` usage (no longer needed)

### Stays
- `page.js` line 185 `useMemo(() => { ... insights ... })` — still computed (StatsTab needs it)
- `page.js` line 673 `insights={insights}` on `<StatsTab>` — kept
- `StatsTab.jsx` compact Insights section — untouched

### New Overview Tab Order
1. Bento grid (Hero + 5 small tiles)
2. ~~Smart Insights~~ ← **removed**
3. Spending Ratio gauge
4. Goals
5. Recent transactions

### Verification
- `npm run build` passes (138 kB unchanged)
- Overview tab no longer shows insights section
- Statistics tab still shows its compact Insights section


