# AGENTS.md — Keuangan Isnan Finance Dashboard

## Stack
- Next.js 14.2.5 (App Router), React 18, JavaScript only (no TypeScript)
- Tailwind CSS 3.4, Recharts 2.12, NextAuth v4 (Google OAuth)
- Data lives entirely in Google Sheets — no database

## Commands
- `npm run dev` — start dev server at localhost:3000
- `npm run build` — production build
- `npm run start` — run production build
- No lint, test, or typecheck scripts exist

## Path aliases
- `@/*` → `./src/*` (via `jsconfig.json`)

## Environment (.env.local)
All 5 vars required at runtime:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth credentials
- `NEXTAUTH_URL` — base URL (local or deployed)
- `NEXTAUTH_SECRET` — random 32+ char string (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `SPREADSHEET_ID` — target Google Sheets spreadsheet ID

## Google Sheets structure
Three required tabs with columns A–M (transaction data):
- `Pemasukan` — income transactions
- `Pengeluaran` — expense transactions
- `Tabungan` — savings transactions

Column layout: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2

One optional tab for the Budgets feature (Phase A):
- `Budgets` — per-category monthly limits. Schema in `docs/sheets-budgets.md`. Columns A–F: Kategori | Bulan | Tahun | Limit | Akun | Catatan.

One optional tab for the Goals feature (Phase B):
- `Goals` — savings goals. Schema in `docs/sheets-goals.md`. Columns A–H: ID | Nama | Target | Deadline | Kategori | Icon | Color | CreatedAt.

If tab names in sheets differ, update `src/app/api/dashboard/route.js` (and the budgets/goals routes for those tabs).

## OAuth scope
Google OAuth must request `https://www.googleapis.com/auth/spreadsheets` (see `src/app/api/auth/[...nextauth]/route.js`).

## Data flow
- `src/app/api/auth/[...nextauth]/route.js` — NextAuth config, stores `accessToken` in session
- `src/app/api/dashboard/route.js` — reads all 3 sheets, returns aggregated data (includes `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory`)
- `src/app/api/transaction/route.js` — appends rows to sheets via Sheets API (now uses find-empty-row + `values.update` instead of `:append` to avoid table-end detection issues)
- `src/app/api/transaction/[id]/route.js` — update (PUT) and clear (DELETE) transaction rows
- `src/app/api/budgets/route.js` — CRUD on the Budgets tab (`GET ?month&year`, `POST`, `PUT`, `DELETE`)
- `src/app/api/goals/route.js` — CRUD on the Goals tab (`GET`, `POST`, `PUT`, `DELETE`); auto-generates ID (`Date.now()`) and `CreatedAt` on POST
- `src/lib/sheets.js` — `getSheetData()`, `parseRupiah()`, `formatRupiah()`, `MONTHS` helpers

## Notes
- `.kilo/` is a separate plugin package; don't modify unless working on Kilo features
- `.agents/skills/` contains 5 installed agent skills (ai-sdk, frontend-design, grill-me, ui-ux-pro-max, vercel-react-best-practices)
- Two `package-lock.json` files exist (root + `.kilo/`); only the root one is for the app
- Custom Tailwind colors: earth, sage, clay, moss, violet
- The app is in Indonesian (id locale)

## Important Gotchas
- **`const` TDZ with `useCallback` deps**: If `handleX = useCallback(fn, [fetchData])` appears before `const fetchData = useCallback(...)`, the `[fetchData]` array accesses `fetchData` while it's still in the temporal dead zone → `ReferenceError: Cannot access 'X' before initialization`. Always define callbacks/variables **before** they appear in another hook's dependency array.
- **`backdrop-filter` creates a CSS stacking context**: `absolute`/`fixed` children with `z-50` inside a `.glass` element are clipped to that context. For dropdowns/menus, use `position: fixed` on `<body>` level with viewport-clamped coordinates.
- **Touch event ordering**: `touchstart` fires before `click` on mobile. If a document-level `touchstart` listener closes a dropdown before `click` fires on a child option, the tap is lost. Fix: use `mousedown` instead of `touchstart` for outside-click handlers, or check a dropdown ref in the handler.

## Recent Work (June 2026)
- **Bento grid UI revamp** — Mixed-size tiles, hero card, glassmorphism, mesh gradients
- **Smart Insights panel** — Auto-generated spending patterns with glow icons
- **Click-to-filter** — Pie chart taps set category filter chip
- **KPI drill-down modal** — Tap income/expense/savings → top 10 transactions
- **Account filter** — Stats tab reads AkunBank from Google Sheets
- **Month comparison** — Category breakdown between two months
- **Donut chart legends** — Percentage + color dots under both pie charts
- **Fixed SelectField dropdown** — Root cause was `touchstart` closing dropdown before `click` on option. Fix: `mousedown` handler + `ddRef` container check + viewport clamping.
- **Pull-to-refresh** — Mobile-native pull gesture with indicator, triggers data refetch
- **Trend chart restored** — Removed `isAllMonths && isAllYears` gate that was hiding it
- **Hooks order fix** — Moved `useMemo`/early returns to fix "Rendered fewer hooks" crash after login
- **Phase 0 refactor** — Split monolithic `page.js` into tab files (`HomeTab.jsx`, `StatsTab.jsx`, `WalletTab.jsx`, `ProfileTab.jsx`) + `_components/` for shared bits
- **H2 Edit/Delete transactions** — `EditTransactionModal` + `/api/transaction/[id]` (PUT/DELETE), `rowIndex` field on all transactions
- **Phase A: Budgets + Net Worth** (Goals push) — G1 per-category monthly budgets (per-month records) + G4 net worth (lite, from transactions)
  - New `src/app/api/budgets/route.js` with composite-key find/update/delete
  - New `src/components/`: `NetWorthCard`, `BudgetCard`, `BudgetProgressBar`, `BudgetSetupModal`, `BudgetDetailModal`, `BudgetsSection`
  - `NetWorthCard` placed as full-width bento-tile below the bento grid on HOME; formula `(Income − Expense) + Savings` accumulated chronologically
  - `BudgetsSection` on STATS between hero and trend chart; respects year+month+account filter (account-less + matching)
  - G6 light: "Saran budget" pills on unbudgeted categories
- **Phase B: Savings Goals + Celebration** (Goals push) — auto-link to Tabungan by category + first-time 100% celebration
  - New `docs/sheets-goals.md` schema doc
  - New `src/app/api/goals/route.js` with rowIndex-based find/update/delete
  - New `src/components/`: `GoalProgressRing`, `GoalSetupModal`, `GoalContributeModal`, `GoalCelebration`, `GoalCard`, `GoalsSection`
  - New `src/app/dashboard/_components/goalUtils.js` (shared `parseDateLoose`, `computeGoalProgress`, `computeAllGoalProgress`)
  - `GoalsSection` placed at top of HOME tab (above bento grid); receives `refreshTrigger` prop from parent to re-fetch
  - `GoalContributeModal` posts to `/api/transaction` with `type: "savings"` and pre-filled `kategori` (auto-link)
  - `GoalCelebration` is dynamic-imported (`canvas-confetti`, ~9KB) with gold-accented toast + `navigator.vibrate([50,30,50])`
  - Celebration trigger: `prevGoalPctRef` in `page.js` tracks last-known progress %; fires only on `<100% → >=100%` crossings (no re-fire past 100%)
  - Triggered after: WALLET submit (savings only), edit transaction, delete transaction — 800ms delay to let `/api/dashboard` refetch complete first
  - Completed goals stay visible with "✓ Selesai" badge + gold ring; ETA shows "Belum ada kontribusi" when rate is 0
  - `canvas-confetti` added as dependency
- **`#REF!` parsing fix** — `pickAmount(row, netIdx, grossIdx)` helper in `src/app/api/dashboard/route.js` detects Google Sheets error values (`#REF!`, `#VALUE!`, `#DIV/0!`, etc.) in column I (Net) and falls through to column E (Jumlah). Prevents silent row drops when sheet has broken formulas. Replaces fragile `parseRupiah(row[8] || row[4] || 0)` pattern at all 3 parser sites (income/expense/savings).
- **POST `/api/transaction` find-empty + update** — Rewrote to use `findNextEmptyRow(accessToken, sheetName)` + `sheetsUpdate` instead of `:append`. Avoids Google Sheets' table-end detection issue (writes to row 9996+ when sheet has formatted empty rows). Now writes to the row immediately after the last data row. Response includes `rowIndex` for the success toast.
- **`pickAmount` hardening** — Replaced `isErr` check (only caught `#`-prefixed strings) with strict `isNumeric` regex `/^-?[\d.,]+$/`. Now also rejects date strings (`"7 Jun 2026"`), text, and any non-numeric value in column I, falling through to column E.

## Relevant Files
- `src/app/dashboard/page.js` — Main dashboard orchestrator (~820 lines): state, filters, modals, pull-to-refresh
- `src/app/dashboard/HomeTab.jsx` — Home tab UI (bento grid + insights + recent)
- `src/app/dashboard/StatsTab.jsx` — Stats tab UI (filters, charts, budgets, calendar, table)
- `src/app/dashboard/WalletTab.jsx` — Add-transaction form
- `src/app/dashboard/ProfileTab.jsx` — Profile tab
- `src/app/dashboard/_components/` — Shared components and constants (THEME, categories, banks, helpers, SelectField, modals, goalUtils)
- `src/components/` — New feature components (NetWorthCard, BudgetCard, BudgetProgressBar, BudgetSetupModal, BudgetDetailModal, BudgetsSection, GoalProgressRing, GoalSetupModal, GoalContributeModal, GoalCelebration, GoalCard)
- `src/app/api/dashboard/route.js` — Google Sheets aggregation (with netWorth, netWorthMonthlyDelta, netWorthHistory)
- `src/app/api/budgets/route.js` — Budgets CRUD
- `src/app/api/goals/route.js` — Goals CRUD
- `src/lib/sheets.js` — Sheet helpers
- `docs/sheets-budgets.md` — Budgets tab schema
- `docs/sheets-goals.md` — Goals tab schema

## Agent Workflow Rules

These rules are persistent and apply to every chat session.

### Subagent Dispatch
- For code, edit, or feature work, dispatch the appropriate subagent(s) from `.agents/` or global `~/.config/opencode/agents/`
- Skip dispatch for read-only questions, explanations, and quick lookups
- Subagent guide:

  **Architecture & Organization**
  - `architect-reviewer` — System design validation, architectural patterns
  - `agent-organizer` — Multi-agent orchestration and team assembly
  - `api-designer` — REST/GraphQL API design and documentation
  - `multi-agent-coordinator` — Complex workflow orchestration across agents

  **Backend & API**
  - `backend-developer` — API routes, server-side logic, auth, databases
  - `fullstack-developer` — End-to-end features (DB → API → UI)
  - `it-ops-orchestrator` — PowerShell, .NET, infrastructure, Azure

  **Frontend & Mobile**
  - `frontend-developer` — React components, UI, state management
  - `ui-designer` — Design systems, visual hierarchy, accessibility
  - `ux-researcher` — User insights, usability testing
  - `mobile-developer` — React Native, Flutter mobile apps
  - `mobile-app-developer` — iOS/Android native development

  **Data & Database**
  - `data-analyst` — Business intelligence, data visualization
  - `data-engineer` — Data pipelines, ETL/ELT processes
  - `data-researcher` — Data mining, collection, pattern recognition
  - `database-optimizer` — Query optimization, performance tuning
  - `postgres-pro` — PostgreSQL administration and optimization

  **Quality & Performance**
  - `code-reviewer` — Code quality, security vulnerabilities, best practices
  - `debugger` — Complex issue diagnosis, root cause analysis
  - `performance-monitor` — System metrics collection, anomaly detection
  - `seo-specialist` — Technical SEO, content optimization

  **Domain & Strategy**
  - `fintech-engineer` — Financial systems, regulatory compliance
  - `business-analyst` — Requirements gathering, process improvement
  - `product-manager` — Product strategy, roadmap planning
  - `project-manager` — Project planning, risk mitigation
  - `risk-manager` — Risk assessment, compliance frameworks
  - `sales-engineer` — Technical pre-sales, solution architecture

  **Research & Analysis**
  - `research-analyst` — Comprehensive information gathering, synthesis
  - `market-researcher` — Market analysis, consumer insights
  - `competitive-analyst` — Competitor intelligence, market positioning
  - `trend-analyst` — Emerging patterns, forecasting
  - `content-marketer` — Content strategy, SEO optimization
  - `technical-writer` — API docs, user guides, technical content
  - `customer-success-manager` — Customer retention, growth

  **Workflow & Distribution**
  - `task-distributor` — Parallel work allocation
  - `workflow-orchestrator` — Multi-step workflows with dependencies

- Invoke multiple subagents in parallel when tasks are independent
- Always pass subagent full context (files, requirements, constraints)

### Skills Auto-Loading
- Load relevant skills from `.agents/skills/` when the task matches triggers
- Available: ai-sdk, frontend-design, grill-me, ui-ux-pro-max, vercel-react-best-practices

### Progress Tracking
- Maintain `progress.md` at project root
- Append new session entries at the BOTTOM (chronological, oldest first)
- Update progress.md at the end of each task/milestone (not after every line edit)
- Each session entry includes: date, tasks completed, files changed, decisions, blockers

