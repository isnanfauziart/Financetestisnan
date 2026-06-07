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
Three tabs must exist with columns A–M:
- `Pemasukan` — income transactions
- `Pengeluaran` — expense transactions
- `Tabungan` — savings transactions

Column layout: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2

If tab names in sheets differ, update `src/app/api/dashboard/route.js`.

## OAuth scope
Google OAuth must request `https://www.googleapis.com/auth/spreadsheets` (see `src/app/api/auth/[...nextauth]/route.js`).

## Data flow
- `src/app/api/auth/[...nextauth]/route.js` — NextAuth config, stores `accessToken` in session
- `src/app/api/dashboard/route.js` — reads all 3 sheets, returns aggregated data
- `src/app/api/transaction/route.js` — appends rows to sheets via Sheets API
- `src/lib/sheets.js` — `getSheetData()`, `parseRupiah()`, `formatRupiah()` helpers

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

## Relevant Files
- `src/app/dashboard/page.js` — Main dashboard (1490 lines): tabs, charts, modals, pull-to-refresh, SelectField
- `src/app/dashboard/page.original.js` — Pre-revamp UI backup
- `src/app/globals.css` — Glass surfaces, mesh gradients, bento/insight card styles, animations
- `tailwind.config.js` — Extended palette (earth, cream, sage, clay, moss, violet, amber, rose, indigo)
- `src/app/api/dashboard/route.js` — Google Sheets aggregation with `account` field
- `src/lib/sheets.js` — Sheet helpers

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

