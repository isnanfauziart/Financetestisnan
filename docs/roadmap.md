# Roadmap — Keuangan Isnan Finance Dashboard

## Current State (June 20, 2026)
- **PR 1–6:** Token layer, test infra, code hygiene, Sheet/Toast/Skeleton/Cache primitives
- **PR 7:** Haptics hook + Snackbar position
- **PR 8:** `can-hover:` Tailwind variant for touch fixes
- **PR 9:** Quick-Add Sheet, Undo Delete, Budget Status Card on Home
- **Hotfix:** Google OAuth token refresh + HomeTab prop mismatch
- **Hotfix:** Favicon (favicon.ico + icon.svg)
- **Bundle:** 143 kB dashboard, 135 tests + 2 skipped

---

## PR 10 — Extract `src/lib/` (Code Hygiene)
**Gate:** 1-week production observation after hotfix → starts ~June 27
**Target:** Shrink `page.js` from ~1011 → ~600 lines by extracting pure-JS logic into testable modules

### Modules to extract

| Module | Source (page.js lines) | Functions | Description |
|---|---|---|---|
| `src/lib/filters.js` | ~200–300 | `deriveFilterState`, `filterTransactions` | All filter logic: month/year/account/date/category/dateRange |
| `src/lib/stats.js` | ~300–400 | `computeStats` | `statIncome`, `statExpense`, `statSavings`, `statSurplus`, `expenseRatio`, `gaugeAngle`, `gaugeColor`, `expenseCategories`, `incomeCategories` |
| `src/lib/insights.js` | ~400–450 | `computeInsights` | Smart insights generation (patterns, anomalies, tips) |
| `src/lib/calendar.js` | ~450–500 | `buildCalendar`, `calendarDayTotals`, `calMonthIdx` | Monthly calendar grid + daily expense aggregation |
| `src/lib/transactions.js` | ~410–530 | `submitTransaction`, `handleWalletSubmit`, `restoreTransaction`, `performDelete` | Transaction CRUD logic (already partially in `helpers.js`) |
| `src/lib/goals.js` | ~130–150 | `checkGoalCelebration` | Goal celebration trigger logic |

### What stays in page.js
- All `useState` / `useEffect` / `useCallback` hooks (state management)
- Pull-to-refresh touch handlers
- JSX render tree
- Navigation / tab switching
- Modal state management

### Verification criteria
- `page.js` < 650 lines
- Each extracted module has its own test file in `tests/lib/`
- All 135 existing tests still pass
- +15–20 new unit tests for lib modules
- `npm run build` — dashboard bundle stays ≤ 145 kB
- No behavior changes (pure refactor)

### Test plan per module
| Test file | Tests | Coverage |
|---|---|---|
| `tests/lib/filters.test.js` | 5–7 | Filter by month/year/account/date range; Semua Bulan/Akun/Tahun |
| `tests/lib/stats.test.js` | 4–6 | Income/expense/savings totals, gauge angle, expense ratio |
| `tests/lib/insights.test.js` | 3–5 | Insight generation from sample transactions |
| `tests/lib/calendar.test.js` | 3–4 | Calendar grid generation, daily totals |
| `tests/lib/transactions.test.js` | 3–4 | Validation, API call structure, error handling |

---

## PR 11 — Zustand State Management
**Gate:** PR 10 merged + 1-week production observation → starts ~July 4
**Target:** Replace 15+ `useState` calls with 4 Zustand slices, eliminate prop drilling, consolidate data fetching

### Store slices

| Store | Replaces `useState` | Purpose |
|---|---|---|
| `useDataStore` | `data`, `loading`, `error`, `lastSyncAt`, `refreshing` | Dashboard data + fetch/refresh logic |
| `useFilterStore` | `selectedMonth/Year/Account`, `categoryFilter`, `dateFrom/To`, `compareMode/A/B`, `calMonth/Year` | All filter + comparison + calendar state |
| `useUIStore` | `activeNav`, `quickAddOpen`, `editingTx`, `deleteConfirmTx`, `toast`, `scrollY` | Navigation + modals + UI state |
| `useGoalStore` | `goalsRefreshTrigger`, `goalCelebration`, `prevGoalPctRef` | Goals + celebration state |

### Benefits
- **`BudgetStatusCard`** reads from `useDataStore` directly → eliminates duplicate `/api/budgets` fetch
- **`GoalsSection`** reads from `useDataStore` + `useGoalStore` → no more `refreshTrigger` prop threading
- **`HomeTab`/`StatsTab`/`WalletTab`/`ProfileTab`** get data from stores → fewer props
- **`page.js`** drops to ~300 lines (just layout + effects + tab routing)
- Haptic/sound preferences move to `useUIStore` (persistent via localStorage middleware)

### New dependency
- `zustand` (~1.2 kB gzipped)

### Verification criteria
- `page.js` < 350 lines
- All existing features work identically
- `npm run build` — dashboard bundle ≤ 148 kB (zustand ~1.2kB offset)
- +10 store tests (filter derivation, stats recomputation, data fetch lifecycle)
- No prop drilling > 2 levels in any component tree

### Risk mitigation
- Zustand stores are created fresh per test → no state leakage
- All store actions are synchronous (except `fetchData`) → easy to test
- `persist` middleware only on `useFilterStore` + `useUIStore` → localStorage writes are non-blocking

---

## Phase 2 — Android Port (Future)
**Gate:** PR 11 merged + 1-week production observation → starts ~July 11

### Architecture
- **Framework:** Expo managed workflow (React Native)
- **Charts:** Victory Native (line, bar, pie, donut)
- **Styling:** NativeWind v4 (Tailwind classes for RN)
- **Auth:** Expo AuthSession → `/api/auth/exchange` endpoint (exchanges Google code for JWT)
- **State:** Reuse `src/lib/` modules (filters, stats, insights, calendar) — pure JS, no DOM deps
- **Navigation:** Expo Router (file-based)

### Phase breakdown

| Phase | Duration | Focus |
|---|---|---|
| **2A: Foundation** | 3 weeks | Expo project, NativeWind setup, auth flow, routing skeleton |
| **2B: Home + Stats** | 3 weeks | Hero card, bento grid → flat cards, Victory Native charts, pull-to-refresh |
| **2C: Wallet + Transactions** | 2 weeks | Add/edit/delete forms, Quick-Add bottom sheet, Undo snack |
| **2D: Budgets + Goals** | 2 weeks | Budget status, goal progress rings, celebration haptics |
| **2E: Polish + Ship** | 2 weeks | Performance audit, Play Store prep, dark mode, edge cases |

### Code sharing strategy
- `src/lib/*.js` → shared pure JS modules (import directly in both web + RN)
- `src/components/` → web-only (React DOM), RN equivalents built separately
- API routes → shared (same backend, both platforms hit the same endpoints)
- NativeWind theme colors → match Tailwind config (earth, sage, clay, moss, violet)

---

## Priority order
1. **PR 10** (next) — Extract src/lib/, production observation starts ~June 27
2. **PR 11** — Zustand adoption, starts ~July 4
3. **Phase 2** — Android port, starts ~July 11

## Not in scope
- TypeScript migration (current policy: JavaScript only)
- Monorepo / code sharing frameworks (single repo + path imports is sufficient)
- i18n (app stays Indonesian)
- Database migration (Google Sheets stays as DB)
