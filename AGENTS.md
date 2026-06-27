# AGENTS.md — Artoku Finance Dashboard

## Stack
- Next.js 14.2.5 (App Router), React 18, JavaScript only (no TypeScript)
- Tailwind CSS 3.4, Recharts 2.12, NextAuth v4 (Google OAuth)
- Data lives entirely in Google Sheets — no database

## Commercialization — Active

**Current Phase:** Phase 1 — Supabase + Multi-Tenancy [PHASE-STATUS]

Artoku is being commercialized as a one-time-payment personal finance app for the Indonesian market. Target: Play Store launch via React Native/Expo.

### Business Model
- **Pricing:** Rp 49,000 one-time lifetime (NOT subscription)
- **Free tier:** 75 txn/month, 4 months history, 3 budgets, 1 goal, 3 insights/week
- **Paid tier:** Unlimited everything + smart features (Health Score, Cash Flow Forecast, Anomaly Alerts)
- **Payment:** Manual QRIS → user uploads proof → admin approves in `/admin` dashboard
- **Break-even:** ~7 paying users covers infra (Supabase Pro + Vercel Pro)

### Target Market
- Indonesia only, Indonesian-first UI (categories: Sedekah, Kondangan, Jajan, Arisan; banks: BCA, BRI, Mandiri, OVO, DANA)
- Segments: Young professionals (25-35), freelancers, students, young families
- USPs: Data lives in user's Google Sheets, one-time payment (not subscription), privacy-first (no bank linking), no ads

### Phase Tracker
- [x] **Phase 0: Security Fixes** ✅ — Token leak fix, tab whitelist, input validation, generic errors, security headers
- [ ] **Phase 1: Supabase + Multi-Tenancy** ← CURRENT — Supabase setup, per-user Google Sheets, update all 15 API routes
- [ ] **Phase 2: Payments + Admin** — Payment API (upload proof), admin dashboard (approve/reject), Supabase Storage
- [ ] **Phase 3: Feature Gating** — Tier limits (75 txn/month wall, budget/goal/insight caps), `/api/me` endpoint
- [ ] **Phase 4: Polish + Hardening** — Rate limiting, zod validation, health check, feature flags, env validation
- [ ] **Phase 5: Testing + Verification** — API tests, data isolation, rate limiting, security headers, manual checklist

Full implementation prompts: `docs/commercialization-prompts.md`
Business plan details: `docs/commercialization-plan.md`
System flow documentation: `docs/Flow-system.md`

### Play Store Launch Plan (React Native/Expo)
Planned after commercialization phases 1-5 are complete. See `docs/roadmap.md` for details.

| Phase | Duration | Focus |
|---|---|---|
| 2A: Foundation | 3 weeks | Expo project, NativeWind setup, auth flow, routing skeleton |
| 2B: Home + Stats | 3 weeks | Hero card, bento grid, Victory Native charts, pull-to-refresh |
| 2C: Wallet + Transactions | 2 weeks | Add/edit/delete forms, Quick-Add bottom sheet, Undo snack |
| 2D: Budgets + Goals | 2 weeks | Budget status, goal progress rings, celebration haptics |
| 2E: Polish + Ship | 2 weeks | Performance audit, Play Store prep, dark mode, edge cases |

Code sharing strategy: `src/lib/*.js` shared pure JS modules (import in both web + RN), API routes shared (same backend), NativeWind theme matches Tailwind config.

### Required for Play Store Submission
- Privacy Policy (Kebijakan Privasi) — PDP compliant, Bahasa Indonesia
- Terms of Service (Syarat & Ketentuan) — Bahasa Indonesia
- PSE Registration at pse.kominfo.go.id (mandatory for Indonesian apps)
- Trademark registration for "Artoku" at DJKI
- App icons, screenshots, store listing in Bahasa Indonesia

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

**Additional vars after Phase 1 (Supabase):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server-side service role key (secret, never expose to client)

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

One optional tab for the Bills feature (Phase C):
- `Tagihan` — bill reminders with auto-transaction creation. Schema in `docs/sheets-tagihan.md`. Columns A–M: ID | Nama | Jumlah | Tipe | KategoriBill | KategoriTransaksi | Frekuensi | TanggalJatuhTempo | AkunBank | Aktif | TerakhirDibayar | Catatan | CreatedAt.

If tab names in sheets differ, update `src/app/api/dashboard/route.js` (and the budgets/goals/bills routes for those tabs).

## OAuth scope
Google OAuth must request `https://www.googleapis.com/auth/spreadsheets` (see `src/app/api/auth/[...nextauth]/route.js`).

## Data flow
- `src/app/api/auth/[...nextauth]/route.js` — NextAuth config, stores `accessToken` in session
- `src/app/api/dashboard/route.js` — reads all 3 sheets, returns aggregated data (includes `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory`)
- `src/app/api/transaction/route.js` — appends rows to sheets via Sheets API (now uses find-empty-row + `values.update` instead of `:append` to avoid table-end detection issues)
- `src/app/api/transaction/[id]/route.js` — update (PUT) and clear (DELETE) transaction rows
- `src/app/api/budgets/route.js` — CRUD on the Budgets tab (`GET ?month&year`, `POST`, `PUT`, `DELETE`)
- `src/app/api/goals/route.js` — CRUD on the Goals tab (`GET`, `POST`, `PUT`, `DELETE`); auto-generates ID (`Date.now()`) and `CreatedAt` on POST
- `src/app/api/bills/route.js` — CRUD on the Tagihan tab (`GET`, `POST`); returns bills with computed `daysUntilDue` and `status`
- `src/app/api/bills/[id]/route.js` — update (PUT) and delete (DELETE) bill rows
- `src/app/api/bills/pay/route.js` — pay a bill: auto-creates transaction in Pemasukan/Pengeluaran + updates `TerakhirDibayar`
- `src/app/api/bills/summary/route.js` — lightweight bill summary for notification checks (upcoming + overdue)
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
- **Phase C: Bills & Push Notifications** — Bill reminders with auto-transaction creation
  - New `docs/sheets-tagihan.md` schema doc
  - New `src/app/api/bills/route.js` (GET + POST) with computed `daysUntilDue` and `status`
  - New `src/app/api/bills/[id]/route.js` (PUT + DELETE) for update/delete
  - New `src/app/api/bills/pay/route.js` — pay bill → auto-creates transaction in Pemasukan/Pengeluaran + updates `TerakhirDibayar`
  - New `src/app/api/bills/summary/route.js` — lightweight summary for notification checks
  - New `src/components/`: `BillSetupModal`, `BillPayModal`, `BillsSection`, `BillsCard`
  - New `src/lib/notifications.js` — service worker registration + notification permission helpers
  - New `public/sw.js` — service worker for notification click handling
  - `BillsSection` on PROFILE tab (like GoalsSection); full CRUD with active/inactive toggle
  - `BillsCard` on HOME tab below GoalsSection; shows next 5 upcoming bills with urgency colors
  - Notification check: `setInterval` in `page.js` checks `/api/bills/summary` every 30 min while app is open; fires browser notifications for overdue/due-today bills
  - Auto-categorization: `BILL_TO_EXPENSE_MAP` / `BILL_TO_INCOME_MAP` maps bill categories → transaction categories
  - 15 bill categories: Listrik, Air (PDAM), Internet/WiFi, Pulsa & Data, BPJS Kesehatan, BPJS Ketenagakerjaan, Asuransi, Sewa Rumah, Cicilan/Kredit, Netflix, Spotify, YouTube Premium, Gym, Arisan, Other
- **`pickAmount` hardening** — Replaced `isErr` check (only caught `#`-prefixed strings) with strict `isNumeric` regex `/^-?[\d.,]+$/`. Now also rejects date strings (`"7 Jun 2026"`), text, and any non-numeric value in column I, falling through to column E.
- **Phase 0: Security Fixes** (commercialization) — 5 production-blocking vulnerabilities fixed: token leak → `getToken()` pattern across all 6 API routes, tab whitelist, input validation on transactions, generic error messages, security headers in `next.config.js`. Full details in `docs/commercialization-prompts.md`.

## Relevant Files
- `src/app/dashboard/page.js` — Main dashboard orchestrator (~820 lines): state, filters, modals, pull-to-refresh
- `src/app/dashboard/HomeTab.jsx` — Home tab UI (bento grid + insights + recent)
- `src/app/dashboard/StatsTab.jsx` — Stats tab UI (filters, charts, budgets, calendar, table)
- `src/app/dashboard/WalletTab.jsx` — Add-transaction form
- `src/app/dashboard/ProfileTab.jsx` — Profile tab
- `src/app/dashboard/_components/` — Shared components and constants (THEME, categories, banks, helpers, SelectField, modals, goalUtils)
- `src/components/` — New feature components (NetWorthCard, BudgetCard, BudgetProgressBar, BudgetSetupModal, BudgetDetailModal, BudgetsSection, GoalProgressRing, GoalSetupModal, GoalContributeModal, GoalCelebration, GoalCard, BillsSection, BillsCard, BillSetupModal, BillPayModal)
- `src/app/api/dashboard/route.js` — Google Sheets aggregation (with netWorth, netWorthMonthlyDelta, netWorthHistory, billsSummary)
- `src/app/api/budgets/route.js` — Budgets CRUD
- `src/app/api/goals/route.js` — Goals CRUD
- `src/app/api/bills/route.js` — Bills CRUD
- `src/app/api/bills/[id]/route.js` — Bill update/delete
- `src/app/api/bills/pay/route.js` — Pay bill → auto-create transaction
- `src/app/api/bills/summary/route.js` — Lightweight bill summary for notifications
- `src/lib/sheets.js` — Sheet helpers
- `src/lib/notifications.js` — Service worker registration + notification helpers
- `public/sw.js` — Service worker for notification click handling
- `docs/sheets-budgets.md` — Budgets tab schema
- `docs/sheets-goals.md` — Goals tab schema
- `docs/sheets-tagihan.md` — Bills tab schema
- `docs/commercialization-plan.md` — Business model, pricing, go-to-market, legal
- `docs/commercialization-prompts.md` — Phase 0-5 implementation prompts (self-contained)
- `docs/Flow-system.md` — User journey, payment flow, feature gating, admin tasks
- `docs/roadmap.md` — PR refactor plan + Android/Expo port phases

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

### Commercialization Phase Tracking
These rules ensure AGENTS.md stays current as commercialization progresses.

**After completing a commercialization phase (0-5):**
1. Update the phase tracker in the `## Commercialization — Active` section above:
   - Mark the completed phase: `- [ ]` → `- [x]` with `✅` suffix
   - Update `[PHASE-STATUS]` to reflect the new current phase
   - Move the `← CURRENT` arrow to the next phase
2. Add a brief entry under `## Recent Work` noting phase completion
3. If new files were created (e.g., `src/lib/supabase.js`), add them to `## Relevant Files`
4. If new environment variables were added, update `## Environment`

**When starting a new commercialization session:**
1. Check the `## Commercialization — Active` section for current phase status
2. Read `docs/commercialization-prompts.md` for the full task breakdown of the current phase
3. Follow the step-by-step prompts in order (each is self-contained with context)
4. The `[PHASE-STATUS]` marker in the phase tracker is grep-able for quick status checks

