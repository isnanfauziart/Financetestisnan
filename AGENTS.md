# AGENTS.md — Artami Finance Dashboard

## Stack
- Next.js 14.2.5 (App Router), React 18, JavaScript only (no TypeScript)
- Tailwind CSS 3.4, Recharts 2.12, NextAuth v4 (Google OAuth)
- Data lives in per-user Google Sheets (multi-tenancy)
- Supabase for user management, tiers, payments, and feature flags

## Commercialization — Active

**Current Phase:** Phase 5 — Testing + Verification [PHASE-STATUS]

Artami is being commercialized as a one-time-payment personal finance app for the Indonesian market. Target: Play Store launch via React Native/Expo.

### Business Model
- **Pricing:** Rp 40,000 one-time lifetime (NOT subscription)
- **Free tier:** 75 txn/month, 4 months history, 3 budgets, 1 goal, 3 insights/week
- **Paid tier:** Unlimited everything + smart features (Health Score, Cash Flow Forecast, Anomaly Alerts)
- **Payment:** QRIS-only manual flow → user uploads proof to private storage → admin approves/rejects in `/admin` dashboard; payment support uses WhatsApp CS
- **Break-even:** ~7 paying users covers infra (Supabase Pro + Vercel Pro)

### Target Market
- Indonesia only, Indonesian-first UI (categories: Sedekah, Kondangan, Jajan, Arisan; banks: BCA, BRI, Mandiri, OVO, DANA)
- Segments: Young professionals (25-35), freelancers, students, young families
- USPs: Data lives in user's Google Sheets, one-time payment (not subscription), privacy-first (no bank linking), no ads

### Phase Tracker
- [x] **Phase 0: Security Fixes** ✅ — Token leak fix, tab whitelist, input validation, generic errors, security headers
- [x] **Phase 1: Supabase + Multi-Tenancy** ✅ — Supabase setup, per-user Google Sheets, update all 15 API routes
- [x] **Phase 2: Payments + Admin** ✅ — Payment API (upload proof), admin dashboard (approve/reject), Supabase Storage
- [x] **Phase 3: Feature Gating** ✅ — Tier limits (75 txn/month wall, budget/goal/insight caps), `/api/me` endpoint
- [x] **Phase 4: Polish + Hardening** ✅ — Rate limiting, shared validation, health check, admin-controlled global/per-user feature flags, env validation, and live acceptance verification
- [ ] **Phase 5: Testing + Verification** ← CURRENT — API tests, data isolation, rate limiting, security headers, manual checklist

Phase 3 confirmed policy: record caps use current Google Sheet rows and deletion releases a slot; budgets receive 3 slots per month; all manual/automated ledger writes share the atomic monthly WIB transaction quota; Undo does not count twice; Free history is the current month plus the previous 3 and is filtered only in Artami; existing data remains readable/editable after Pro revocation; Free users see 3 stable insights/week; Health Score, Cash Flow Forecast, Anomaly Alerts, Financial Independence, What-If, and Year-in-Review stay discoverable through non-personal static blurred previews, while their real components and calculations remain locked; Free monthly PDFs are watermarked; limit warnings appear at 80% and 100%. The approved policy is also reflected in the implementation and commercialization documentation.

Phase 3 implementation policy: global feature flags remain Phase 4; canonical usage names are `transactions`, `budgets`, `goals`, `debts`, `momental`, `bills`, and `insights`; unverifiable tier/quota state fails closed for new Free creations while safe reads/edits remain available; Profile owns the full quota display; Pro limits serialize as `null`; every normalized email in Supabase `admins` has permanent effective Pro access across auth, payment, quota, and UI paths; no analytics vendor, per-user overrides, grace periods, or mobile-only endpoints are added.

Phase 4 decision update: the Phase 3 no-per-user-override rule remains historical. Phase 4 adds admin-managed per-user feature overrides on top of global defaults; users without an override inherit the global setting.
Phase 4 operational decisions: optional or risky features fail closed when unreadable, successful updates invalidate the short cache, controls live in `/admin`, and disabled features are hidden with a simple unavailable message for stale or direct access.
Phase 4 hardening decisions: resolve feature flags server-side and expose only the current user’s effective access; rate-limit NextAuth separately by IP; keep security headers in `next.config.js`; and use minimal safe request-aware logging without sensitive values.
Phase 4 environment/admin decisions: Vercel Production and Preview show all 11 required environment-variable names; `SPREADSHEET_ID` is an extra legacy variable and is not required by the per-user runtime. Admin controls use clear OFF confirmation, record `updated_at` and `updated_by`, find users by email/name search, and keep flag reads server-side. `/api/health` remains a fast liveness/configuration check without Google or Supabase network calls.
Phase 4 Nice to Know decisions: retain last-change metadata, in-memory rate limiting, short unavailable messages, and switch-off code/data; include simple future-dated global/targeted toggles and admin user-segment filters while deferring recurring schedules and richer segmentation.

Phase 4 implementation status: complete as of 1 August 2026. Rate limiting, shared validation, request-aware logging, request IDs, health/configuration checks, production env fail-fast, private global/per-user feature flags, one-time schedules, segment filters, admin confirmations, and UI/API enforcement passed local tests, production build verification, live migration checks, and authenticated admin acceptance checks.

Phase 3 implementation status: complete as of 30 July 2026. Effective entitlement, `/api/me`, atomic quotas, replay-safe Undo, atomic bill/debt payments, Sheet-backed record caps, WIB history filtering, stable weekly insights, watermarked Free PDFs, locked Pro previews, and the split Plan sections are in place. Supabase migration `008-phase3-feature-gating.sql` was applied; live RPC/REST auth tests passed; production Free → Pro → Free revocation smoke passed; admin permanent Pro was already verified; `/api/me` and related routes are healthy; the full suite passed with 272 passed and 2 skipped; production build passed.

Full implementation prompts: `docs/commercialization-prompts.md`
Business plan details: `docs/commercialization-plan.md`
System flow documentation: `docs/Flow-system.md`

## Recent Work

- 2026-07-30 — Phase 3 Feature Gating completed and verified; Phase 4 Polish + Hardening is current.
- 2026-08-01 — Phase 4 hardening implemented locally; migration applied and read-only verified; full suite and production build verified; authenticated admin/manual release checks remain.
- 2026-08-01 — Phase 4 Polish + Hardening completed and verified; Phase 5 Testing + Verification is now current.

### Play Store Launch Plan (React Native/Expo)
Planned after commercialization phases 1-5 are complete. See `docs/play-store-react-native-plan.md` for details.

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
- Trademark registration for "Artami" at DJKI
- App icons, screenshots, store listing in Bahasa Indonesia

## Commands
- `npm run dev` — start dev server at localhost:3000
- `npm run build` — production build
- `npm run test` — run the Vitest suite
- `npm run start` — run production build
- No standalone lint or typecheck scripts exist

## Path aliases
- `@/*` → `./src/*` (via `jsconfig.json`)

## Environment (.env.local)
Required runtime vars:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth credentials
- `NEXTAUTH_URL` — base URL (local or deployed)
- `NEXTAUTH_SECRET` — random 32+ char string (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `LEGACY_SHEET_OWNER_EMAIL` — owner email allowed to connect the pre-Artami private spreadsheet
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — browser OAuth client ID for Google Picker (same project as server OAuth)
- `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` — restricted browser API key for Google Picker
- `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` — Google Cloud project number for Picker `setAppId`

**Additional vars after Phase 1 (Supabase):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server-side service role key (secret, never expose to client)

## Google Sheets structure
Three required tabs use the common A-O transaction columns. `Pengeluaran`
adds P=`Sifat` for expense classification:
- `Pemasukan` — income transactions, A:O
- `Pengeluaran` — expense transactions, A:P (`Sifat` in P)
- `Tabungan` — savings transactions, A:O

Column layout: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2 | EventID | EventSubKategori
`Pengeluaran!P:P` stores `Rutin` or `Spesial`; blank or unknown legacy values
normalize to `Rutin`. Actual accounting totals, net worth, budgets, quota,
calendar totals, and ledger visibility include both classes. Routine trends,
averages, anomaly alerts, forecast baselines, selected Health Score factors,
and stable insights exclude `Spesial` expenses.

One optional tab for the Budgets feature (Phase A):
- `Budgets` — per-category monthly limits. Schema in `docs/sheets-budgets.md`. Columns A–F: Kategori | Bulan | Tahun | Limit | Akun | Catatan.

One optional tab for the Goals feature (Phase B):
- `Goals` - savings goals. Schema in `docs/sheets-goals.md`. Columns A-I: ID | Nama | Target | Deadline | Kategori | Icon | Color | CreatedAt | Status.

One optional tab for the Bills feature (Phase C):
- `Tagihan` — bill reminders with auto-transaction creation. Schema in `docs/sheets-tagihan.md`. Columns A–M: ID | Nama | Jumlah | Tipe | KategoriBill | KategoriTransaksi | Frekuensi | TanggalJatuhTempo | AkunBank | Aktif | TerakhirDibayar | Catatan | CreatedAt.

If tab names in sheets differ, update `src/app/api/dashboard/route.js` (and the budgets/goals/bills routes for those tabs).

## OAuth scope
Google OAuth must request `https://www.googleapis.com/auth/drive.file` only for Sheets access (plus `openid email profile` for sign-in). Do not request `https://www.googleapis.com/auth/spreadsheets`. Normal users get app-created spreadsheets; the configured owner connects one existing private spreadsheet through Google Picker.

## Data flow
- `src/app/api/auth/[...nextauth]/route.js` - NextAuth config, stores `accessToken` in the JWT, not the client session
- `src/app/api/dashboard/route.js` — reads all 3 sheets, returns actual aggregates plus routine expense aggregates (includes `netWorth`, `netWorthMonthlyDelta`, `netWorthHistory`)
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

## Project History

Feature-by-feature history lives in `git log` and `progress.md`. Two facts that are not obvious from either:

- The app was renamed **Artoku -> Artami** in June 2026, including the Android package ID (`com.artoku.app` -> `com.artami.app`) and the keystore. Old references should not reappear.
- **Finance data stays in Google Sheets, not Supabase.** This is deliberate: the user owning their own ledger is the product's main differentiator. Supabase holds only account metadata (tier, payments, usage, flags, admins).

## Relevant Files
- `src/app/dashboard/page.js` — Main dashboard orchestrator (~820 lines): state, filters, modals, pull-to-refresh
- `src/app/dashboard/HomeTab.jsx` — Home tab UI (bento grid + insights + recent)
- `src/app/dashboard/StatsTab.jsx` — Stats tab UI (filters, charts, budgets, calendar, table)
- `src/app/dashboard/WalletTab.jsx` — Add-transaction form
- `src/app/dashboard/ProfileTab.jsx` — Profile tab
- `src/components/CategoryManager.jsx` — Per-user expense, income, and savings category manager
- `src/app/dashboard/_components/` — Shared components and constants (THEME, categories, banks, helpers, SelectField, modals, goalUtils)
- `src/components/` — New feature components (NetWorthCard, BudgetCard, BudgetProgressBar, BudgetSetupModal, BudgetDetailModal, BudgetsSection, GoalProgressRing, GoalSetupModal, GoalContributeModal, GoalCelebration, GoalCard, BillsSection, BillsCard, BillSetupModal, BillPayModal)
- `src/app/api/dashboard/route.js` — Google Sheets aggregation (with netWorth, netWorthMonthlyDelta, netWorthHistory, billsSummary)
- `src/app/api/budgets/route.js` — Budgets CRUD
- `src/app/api/goals/route.js` — Goals CRUD
- `src/app/api/bills/route.js` — Bills CRUD
- `src/app/api/bills/[id]/route.js` — Bill update/delete
- `src/app/api/bills/pay/route.js` — Pay bill → auto-create transaction
- `src/app/api/bills/summary/route.js` — Lightweight bill summary for notifications
- `src/app/api/debts/route.js` - Debts/piutang CRUD and payment action
- `src/app/api/momental/route.js` - Event budget CRUD
- `src/app/api/momental/[id]/route.js` - Single event detail/update/delete
- `src/app/api/momental/summary/route.js` - Active event summary
- `src/app/api/settings/route.js` - User settings
- `src/lib/categories.js` — Starter/legacy category defaults, validation, archival, and savings liquidity metadata
- `src/app/api/me/route.js` — Effective entitlement, usage metadata, WIB reset dates, history policy, and feature access
- `src/app/api/health/route.js` — Safe liveness/configuration check
- `src/app/api/admin/features/route.js`, `src/app/api/admin/users/route.js`, `src/app/api/admin/users/[id]/route.js` — Admin feature controls, schedules, overrides, user directory, and read-only user detail
- `src/app/admin/AdminShell.jsx`, `src/app/admin/AdminUsersClient.jsx`, `src/app/admin/AdminFeatureControls.jsx` — Admin workspace tabs, user directory, and feature switchboard UI
- `src/lib/featureFlags.js`, `src/lib/featureAccess.js`, `src/lib/featureGuard.js` — Server flag resolution, client-safe access, and disabled-feature responses
- `src/lib/rateLimit.js`, `src/lib/env.js`, `src/lib/validation.js`, `src/lib/logger.js`, `src/middleware.js` — Phase 4 hardening primitives
- `src/lib/sheets.js` — Sheet helpers
- `src/lib/notifications.js` — Service worker registration + notification helpers
- `src/lib/supabase.js` — Browser Supabase client
- `src/lib/supabaseAdmin.js` — Server-side admin client
- `src/lib/sheetManager.js` — Creates Google Sheet with 10 tabs and seeds categories for new users
- `src/lib/user.js` — getOrCreateUser() helper for Supabase user management
- `src/lib/apiAuth.js` — getAuthContext() helper replacing getToken() pattern
- `src/lib/activity.js`, `src/lib/adminUsers.js` — Throttled authenticated activity writes and safe admin user/detail formatting
- `supabase/010-admin-user-activity.sql` — Nullable indexed `users.last_seen_at` metadata
- `src/lib/entitlement.js` — shared stored-tier/admin effective entitlement resolver
- `src/lib/tier.js` — canonical limits, feature access, warnings, and history policy
- `src/lib/usage.js` — WIB period/reset helpers and Supabase usage RPC wrappers
- `src/lib/transactionQuota.js`, `src/lib/transactionUndo.js`, `src/lib/writeClaims.js` — transaction reservation, secure Undo, and replay-safe write claims
- `src/lib/recordQuota.js` — Sheet-backed record counts and serialized Free creation caps
- `src/components/QuotaNotice.jsx`, `src/components/TransactionQuotaStatus.jsx` — accessible limit feedback and upgrade actions
- `src/lib/insights.js` and `src/components/LockedFeaturePreview.jsx` — stable weekly insights and static Free-tier Pro previews
- `supabase/008-phase3-feature-gating.sql` — atomic usage, write claims, creation locks, admin normalization, and service-role RPC hardening
- `supabase/009-phase4-feature-flag-foundation.sql` — private feature overrides, schedule metadata, and service-role-only flag access
- `public/sw.js` — Service worker for notification click handling
- `docs/sheets-budgets.md` — Budgets tab schema
- `docs/sheets-goals.md` — Goals tab schema
- `docs/sheets-tagihan.md` — Bills tab schema
- `docs/commercialization-plan.md` — Business model, pricing, go-to-market, legal
- `docs/commercialization-prompts.md` — Phase 0-5 implementation prompts (self-contained)
- `docs/Flow-system.md` — User journey, payment flow, feature gating, admin tasks
- `docs/play-store-react-native-plan.md` — Android/Expo port phases
- `docs/motion-graphics.md` — launch motion graphic brief, storyboard, and revamp checklist
- `docs/archive/` — shipped one-shot plans, kept for the decision trail

## Agent Workflow Rules

These rules are persistent and apply to every chat session.

### Instruction Precedence and Lean Implementation Workflow

These rules override conflicting workflow, subagent, review, testing, and
verification instructions elsewhere in this file.

When instructions conflict, apply this order:
1. Platform and system safety constraints
2. The user's explicit current request
3. This repository's `AGENTS.md`
4. Loaded skill instructions
5. Agent and subagent defaults

Skills remain mandatory when directly applicable, but they are scope-bound.
They may not expand the approved task or create duplicate agents, design
documents, review loops, full test runs, builds, or commits. Follow the
non-conflicting parts of a skill. Use the leaner interpretation for Low and
Medium-risk work, and the safer interpretation for High-risk work. Ask only
when the conflict materially affects scope, behavior, cost, security, or data
safety.

#### Scope Contract

Before implementation, define one task contract:
- outcome and acceptance criteria
- included behaviors and affected areas
- explicit exclusions
- protected invariants
- risk tier: Low, Medium, or High
- focused checks for each implementation batch
- one integration owner

Stop and ask before proceeding when acceptance requires scope expansion, an
unapproved protected-contract change, a destructive operation, unclear
ownership of overlapping dirty work, or a High-risk change that was not
classified as such. Do not restart completed work when clarification is
needed.

Fix only task-caused regressions, unmet acceptance criteria, and directly
affected security, privacy, accessibility, financial, or data-integrity
invariants. Defer unrelated refactors, cleanup, caching redesigns, and
pre-existing technical debt. Critical security, tenant-isolation, or
data-loss findings may block release, but must be reported separately rather
than silently absorbed into scope.

#### Risk Tiers

**Low:** Documentation, copy, isolated styling, or local UI behavior with no
protected data, authorization, quota, payment, or persistence contract.

**Medium:** Shared UI state, shared utilities, API behavior, caching, or
cross-component behavior that does not touch a High-risk area.

**High:** Authentication or authorization; payments or payment proofs;
entitlements, feature access, or admin privilege; quotas, reservations,
replay protection, or concurrency; Google Sheets financial reads/writes;
Supabase migrations, RPCs, RLS, or service-role boundaries; tenant isolation;
secrets, validation boundaries, security headers, or other security controls.

When uncertain, use the higher tier.

#### Batching and Ownership

Use the fewest coherent batches needed. Each batch has one owner, a bounded
file and behavior scope, known dependencies, and one focused verification
command. Batches are not separate tasks and do not receive separate review
cycles.

One agent owns each file at a time. Keep one implementation owner through
normal fixes so context is preserved. Parallel work is allowed only when
batches are independent, file ownership is disjoint, contracts are stable,
neither batch depends on the other's output, and no shared state, migration,
generated artifact, or fixture is being changed. Do not parallelize small
tasks, shared components, protected state transitions, migrations, or work
likely to touch the same files.

#### Subagent Thresholds

- Read-only analysis, explanations, and quick lookups need no subagent.
- Low-risk implementation may use the primary agent alone.
- Medium-risk work may use one specialist when it spans layers, exceeds the
  working context, or needs domain expertise.
- High-risk work requires an appropriate implementation owner and targeted
  domain expertise unless the primary agent already has it.
- Every implementation task, including Low-risk work, requires exactly one
  independent final diff reviewer who did not implement the change.
- Use multiple implementation agents only for genuinely independent work.

Do not use an implementer -> reviewer -> fixer -> re-review chain for each
batch. The original implementation owner fixes accepted findings whenever
possible.

#### Verification Gates

After each batch, run only tests directly covering changed behavior, the
smallest adjacent regression check needed for a shared contract, and required
static or UI checks. Do not run the full suite or production build after each
batch.

Use test-first or regression-first checks for bugs, meaningful behavior
changes, finance logic, auth, authorization, quotas, payments, tenant
isolation, migrations, and security boundaries. TDD is not required for
documentation, copy, or purely visual CSS changes.

After all batches pass focused checks, perform exactly one independent final
diff review. Give the reviewer the complete diff, task contract, exclusions,
risk tier, and focused-test evidence. The reviewer may block only on:
- task-caused regressions
- unmet acceptance criteria
- changed protected invariants
- security, privacy, tenant-isolation, data-integrity, or accessibility defects
  in changed code
- missing focused coverage for changed behavior

Every blocking finding must name the changed location, violated criterion or
invariant, concrete impact or reproducible failure, and smallest correction.
The reviewer must not require unrelated refactors, speculative abstractions,
pre-existing repairs, or audits of systems untouched by the task. Do not start
a second broad review. If a correction requires substantial redesign or a new
protected-contract change, stop and request a separately approved follow-up.
For a bounded correction, the original implementation owner reruns the
affected focused checks; the reviewer may confirm that correction within the
same final-review gate without reopening the whole diff.

Run the full test suite once after the final review and bounded corrections.
Run one production build after that for runtime-affecting work. Documentation
tasks skip the build unless they change runtime, deployment, generated output,
or build configuration. Rerun a successful integration check only when a
later change invalidates it; if an integration command fails, fix the task
root cause with a focused check and rerun only that failed integration command.
The integration owner defines the final gate as the full suite, production
build, and `git diff --check` for runtime-affecting work; `git diff --check`
plus targeted content or format checks for documentation-only work; and the
applicable focused checks plus `git diff --check` for other work.

High-risk work additionally requires applicable negative, boundary,
authorization, tenant-isolation, atomicity, replay, concurrency, failure
cleanup, and fail-closed checks. These checks are additive; the full suite
does not replace them.

#### Findings and Failure Recovery

Classify findings as task regression, task blocker, pre-existing issue, or
enhancement/technical debt. Do not fix pre-existing or unrelated findings
without explicit scope approval. Record them separately.

When a batch fails, keep earlier passing batches intact. Fix or back out only
the failing batch, rerun its focused checks, and continue. Never reset the
worktree, discard unrelated dirty work, or reimplement completed batches.

#### Definition of Done

A task is complete only when its acceptance criteria and protected invariants
are satisfied, focused checks pass, exactly one independent final review is
complete, task-caused blocking findings are resolved, the one-time integration
gate passes or has a documented external blocker, and no unrelated scope was
silently added. Update `progress.md` once at the completed task or milestone,
not after every batch. Update commercialization phase tracking only after the
whole phase passes its required final verification.

### Subagent Dispatch
- Use the thresholds above instead of automatic dispatch for every code or edit task.
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

- Invoke multiple implementation subagents in parallel only when the batching rules above permit it
- Always pass subagent full context (files, requirements, constraints)

### Skills Auto-Loading
- Load only skills directly applicable to the approved task, once at task start unless the task materially changes domain
- Skills govern execution method but may not expand product scope or duplicate workflow gates
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
