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


