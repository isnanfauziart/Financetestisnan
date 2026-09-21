# Progress Log — Artami Finance Dashboard

Session log, oldest first. Entries before 22 July 2026 were trimmed; that history lives in `git log`.

Append new entries at the BOTTOM. Each entry: date, tasks completed, files changed, decisions, blockers.

## Session: July 22, 2026 - Documentation Audit Cleanup

### Tasks Completed
- Replaced stale root README with current setup, env, data model, and doc map.
- Replaced stale commercialization plan and system flow with current concise source-of-truth docs.
- Replaced old roadmap with commercialization-first roadmap.
- Completed the Debts sheet schema with API and payment behavior.
- Updated landing page README after duplicate prompt cleanup.
- Added status notes to Supabase README and commercialization prompts archive.
- Corrected AGENTS.md schema/status details for transaction A-O columns and Goals A-I status.

### Files Changed
- README.md
- AGENTS.md
- docs/commercialization-plan.md
- docs/Flow-system.md
- docs/roadmap.md
- docs/sheets-debts.md
- docs/commercialization-prompts.md
- supabase/README.md
- landingpageartami/README.md
- progress.md

### Decisions
- Kept `docs/commercialization-prompts.md` as an archive instead of splitting it; shorter and avoids creating more docs.
- Marked payment/admin and feature-gating flows as planned until their routes exist.

### Blockers
- `apply_patch` was blocked by a Windows sandbox ACL error, so docs were written with one scoped PowerShell pass.

## Session: July 23, 2026 - Phase 2 Payment Decisions

### Tasks Completed
- Synced the current documentation and public pricing copy to Rp40.000 lifetime Pro.
- Defined the Phase 2 MVP as QRIS only: a dedicated `/upgrade` page displays the static QRIS and a `Simpan QR` action.
- Defined private payment-proof storage, signed admin-only proof access, manual approval/rejection, and WhatsApp CS for rejected payments.

### Files Changed
- docs/commercialization-plan.md
- docs/Flow-system.md
- docs/commercialization-prompts.md
- docs/play-store-react-native-plan.md
- supabase/005-seed.sql
- src/app/terms/page.js
- landingpageartami/src/App.jsx
- landingpageartami/index.html
- landingpageartami/spec.md
- docs/UI & UX Analysis.md
- progress.md

### Decisions
- Pro costs Rp40.000 once; QRIS is the sole MVP payment method.
- The provided GoPay QRIS is shown only on `/upgrade`, never inline below an upgrade CTA.
- Proofs remain private; no payment tier changes until manual admin approval.
- Rejected payments route users to WhatsApp CS at +62 882-0062-82613.

### Blockers
- Phase 2 remains unimplemented and unchecked; the QRIS asset still needs to be added to the workspace when the upgrade page is built.

## Session: July 24, 2026 - Phase 2 Payment Timing Decisions

### Tasks Completed
- Documented the two-stage payment request and proof-submission lifecycle.
- Added the 48-hour payment deadline, one-hour proof-upload grace period, countdown/deadline UI, cancellation, expiry, and retained history requirements.
- Added fixed Rp40.000 copy behavior and separate underpayment/overpayment guidance.

### Files Changed
- docs/commercialization-plan.md
- docs/Flow-system.md
- docs/commercialization-prompts.md
- progress.md

### Decisions
- Opening `/upgrade` creates nothing; `Mulai Pembayaran` starts the 48-hour request.
- The page shows a live countdown and exact WIB deadline; the amount is fixed with `Salin Nominal`.
- Payment must occur before the original deadline. Proof may be uploaded up to one hour late and is marked for admin review.
- After the grace period, history remains and the UI prioritizes WhatsApp CS while warning against duplicate payment.
- Underpayment may use `Nominal tidak sesuai`; overpayment instead shows `Jika salah pembayaran, silahkan hubungi CS`.
- Underpayment cannot be topped up. Overpayment uses `rejected` + `Lainnya` and requires an explanatory admin note.
- Refunds and corrections stay in WhatsApp; the admin records the outcome in the payment note.
- WhatsApp support messages are editable and contain only an issue type plus `PAY-XXXXXXXX`, not the full UUID, proof URL, or sensitive details.
- `Hubungi CS` is limited to payment-support states and automatically selects an editable issue context.
- Starting a new request during the grace hour requires confirmation and abandons late-proof eligibility.
- Pending proof is immutable; payment history remains visible with owner-only signed proof access.
- Phase 2 status changes use in-app banners only, with no automatic WhatsApp, email, or push messages.
- Proof-viewing signed URLs last 5 minutes and are regenerated on demand.
- Result-banner dismissal is local per device; payment history remains authoritative.
- Admin pending work is oldest-first, marks late proof, polls every 30 seconds, and supports manual refresh.
- Approval/rejection requires a payment-summary confirmation.
- Admin may correct `rejected` to `approved` through the protected correction flow.
- Rejected-to-approved correction now requires confirmation, a preset reason, audit fields, and no newer active request.
- Original rejection details remain preserved; corrected approvals can later use the normal revocation flow.
- Users receive a specific reconsideration-approval banner.
- Admin history covers all completed/inactive states and supports PAY-reference or email search.
- Future documentation batches are applied after every seven approved answers.

### Blockers
- Phase 2 remains unimplemented and unchecked.

## Session: July 25, 2026 - Phase 2 Decision Packet

### Tasks Completed
- Consolidated the remaining Phase 2 product decisions into one temporary approval-by-exception packet.
- Defined that approved answers must be merged into permanent documentation before the packet is deleted.
- Resolved all 14 packet decisions and merged them into the permanent Phase 2 plan, flow, implementation prompt, Privacy Policy, and Terms.
- Verified the permanent documentation and production build, then deleted the resolved temporary packet.

### Files Changed
- docs/phase-2-decision-packet.md
- docs/commercialization-plan.md
- docs/Flow-system.md
- docs/commercialization-prompts.md
- src/app/privacy/page.js
- src/app/terms/page.js
- progress.md

### Decisions
- Future unresolved Phase 2 questions are reviewed as one finite packet instead of an open-ended interview.
- The temporary packet is deleted after all decisions are resolved, synchronized, and verified.
- Defaults 1-9 and 11-14 were approved.
- Account deletion revokes Pro but retains email and payment history; a returning same-email user may receive manual Pro restoration for a documented valid reason.

### Blockers
- Phase 2 decisions are resolved; implementation and verification remain pending.

## 2026-07-25 — Phase 2 payments and admin implemented locally

### Tasks Completed
- Added the Rp40.000 QRIS-only `/upgrade` flow, private proof upload, payment history, status banners, WhatsApp support, and account-deletion disclosure.
- Added owner payment APIs, signed proof access, `/admin`, approve/reject/revoke/correct actions, and manual Pro restoration.
- Added the Phase 2 Supabase migration, private Storage bucket configuration, admin seed, payment audit fields, active-payment constraint, and atomic admin review function.
- Added the approved GoPay QRIS asset and verified focused tests plus the production build.

### Files Changed
- `supabase/007-payments-phase2.sql`
- `src/app/api/payments/**`
- `src/app/api/admin/**`
- `src/app/api/account/route.js`
- `src/app/upgrade/**`
- `src/app/admin/**`
- `src/components/PaymentQrisFlow.jsx`
- `src/app/dashboard/_components/PaymentStatusBanner.jsx`
- `src/lib/payments.js`, `src/lib/paymentAuth.js`, `src/lib/adminAuth.js`, `src/lib/user.js`
- `public/payment/qris-gopay.jpeg`
- Payment and user tests

### Decisions
- Phase 2 stays unchecked until the production migration and real payment flow are verified.

### Blockers
- Run one real QRIS upload and admin approve/reject verification after deployment.

### Status Update
- Owner reports that `supabase/007-payments-phase2.sql` has been applied to Supabase.
- Focused Phase 2 tests: 15 passed. Production build: passed.

## 2026-07-25 — Phase 2 completed

### Verification
- Production QRIS proof upload works.
- Admin approval works and the user account displays Pro benefits instead of the upgrade CTA.
- Phase 2 migration, focused tests, production build, and live approval flow are complete.

### Next Phase
- Phase 3 — Feature Gating: enforce free-tier limits and add `/api/me`.

## 2026-07-26 — Phase 3 feature-gating discussion started

### Tasks Completed
- Audited the current Phase 3 prompt, API routes, Supabase usage foundation, tier flow, smart-feature UI, and existing tests.
- Consolidated all unresolved Phase 3 decisions into one prioritized discussion packet.
- Recorded the owner's C1-C11 decisions, removed their answered question blocks, and inventoried the remaining dashboard features.
- Synchronized the confirmed Phase 3 policy and current tracker status across commercialization documentation.

### Files Changed
- `AGENTS.md`
- `docs/phase 3 feature gating discussing.md`
- `docs/commercialization-plan.md`
- `docs/commercialization-prompts.md`
- `docs/Flow-system.md`
- `src/lib/tier.js`
- `src/lib/usage.js`
- `progress.md`

### Decisions
- Budgets, goals, debts/piutang, Momental events, and bills use current-record limits; deleting a record releases its slot.
- The 75-transaction quota counts successful creations in the current calendar month regardless of the entered transaction date; deletion does not refund quota.
- Budgets receive three slots per month; every existing row counts until deleted.
- Automated goal, bill, and debt ledger writes consume transaction quota; Undo does not consume it twice.
- Pro revocation preserves readable/editable data and blocks only over-limit creation.
- Free history is filtered in Artami while older rows remain available in Google Sheets.
- Free insights are three stable weekly cards.
- Health Score, Cash Flow Forecast, and Anomaly Alerts are entirely absent from the Free UI.
- Recap, category charts, actual monthly trends, Savings Rate Trend, heatmap, month comparison, and drill-downs remain Free within the four-month history window.
- Existing Free users start with a fresh transaction allowance; transaction writes use an atomic reservation with release on failure.
- Added isolated, unwired `src/lib/tier.js` and `src/lib/usage.js` helpers; their unresolved policy values remain provisional until the discussion packet is approved.

### Blockers
- Financial Independence/report classification, the exact four-month window, Medium decisions, and Nice-to-know defaults still require review before implementation.

## 2026-07-27 — Phase 3 feature and UX policy approved

### Tasks Completed
- Recorded approval for Financial Independence, What-If, report gating, the exact Free history window, and Medium decisions M1-M9.
- Closed Medium decisions M10-M13 and all Nice-to-know decisions.
- Removed the answered prompts from the discussion packet and synchronized the commercialization documentation.
- Removed the redundant planned `/api/me/upgrade` endpoint from Phase 3 documentation.

### Files Changed
- `AGENTS.md`
- `docs/phase 3 feature gating discussing.md`
- `docs/commercialization-plan.md`
- `docs/commercialization-prompts.md`
- `docs/Flow-system.md`
- `progress.md`

### Decisions
- Financial Independence, What-If, and Year-in-Review are Pro-only and completely absent from the Free UI.
- Free monthly PDFs carry a watermark; Pro PDFs do not.
- Free history is the current WIB calendar month plus the previous three; Recap and Profile explain that older data remains in Google Sheets.
- Monthly quota resets use WIB; income, expense, and savings share one allowance.
- Existing records remain editable at the limit.
- `/api/me` is the sole Phase 3 entitlement/usage endpoint; `/api/me/upgrade` is not added.
- Limit failures use the approved HTTP 403 contract, retain form values, and link to `/upgrade`.
- The dashboard trusts fresh server entitlement and shows compact warnings at 80% and 100%.
- Feature flags remain Phase 4 and canonical plural usage names are used.
- Unverifiable tier/quota state fails closed for new Free creations while safe reads and edits remain available.
- Profile owns full quota display; Pro limits serialize as `null`.
- No analytics vendor, per-user overrides, grace periods, mobile-only endpoints, or speculative quota/billing systems are added.
- The approved verification scope covers quota logic, automated paths, concurrency, smart-feature absence/presence, production build, and the manual Free-to-Pro-to-revoked flow.

### Blockers
- Product decisions are complete; the consolidated Phase 3 design still needs explicit approval before writing the implementation plan.

## 2026-07-28 — Phase 3A entitlement foundation implemented

### Tasks Completed
- Finalized the canonical Free/Pro tier and WIB usage helpers.
- Added shared effective entitlement resolution so every normalized Supabase admin is always treated as Pro across API auth, payments, and quota decisions.
- Added `/api/me` with entitlement status, canonical usage metadata, warning thresholds, reset dates, smart-feature access, history policy, and monthly PDF policy.
- Added `supabase/008-phase3-feature-gating.sql` with atomic usage reservation/release, paid/admin quota bypass derived inside SQL, normalized admin identity, and service-role-only backend RPC permissions.
- Added focused Phase 3A tests and completed an independent security/spec review.
- Synchronized the approved locked-preview and permanent-admin-Pro decisions across Phase 3 documentation.

### Files Changed
- `src/lib/tier.js`, `src/lib/usage.js`, `src/lib/entitlement.js`
- `src/lib/apiAuth.js`, `src/lib/paymentAuth.js`, `src/lib/adminAuth.js`
- `src/app/api/me/route.js`
- `supabase/008-phase3-feature-gating.sql`, `supabase/README.md`
- Phase 3A entitlement, migration, and route tests
- `AGENTS.md`, Phase 3 documentation, and `progress.md`

### Verification
- Focused Phase 3A suite: 6 files, 18 tests passed.
- Production build passed and includes `/api/me`.
- Full repository suite: 198 passed, 15 failed, 2 skipped. The 15 failures were present before Phase 3A and remain confined to unrelated QuickAddSheet, Sheet, and dashboard-cache/component tests.

### Decisions
- Phase 3 remains current and incomplete; Phase 3A does not enforce CRUD limits or change dashboard UI.
- Sheet-backed record counts remain `current: null` in `/api/me` until their later enforcement/UI subphase.
- Free usage lookup failures return retryable 503 responses; verified Pro/admin entitlement remains readable if usage counting is temporarily unavailable.

### Blockers
- Apply `supabase/008-phase3-feature-gating.sql` to the live Supabase project and smoke-test service-role usage RPCs before starting Phase 3B transaction enforcement.

## 2026-07-28 — Phase 3B-3C transaction and record gating implemented

### Tasks Completed
- Enforced the shared 75-transaction WIB monthly quota across manual entries, goal contributions, bill payments, and debt payments.
- Added replay-safe 30-second Undo tokens, concurrency-safe Sheet appends, deterministic automated-payment IDs, atomic Sheet batches, and quota release on failed writes.
- Enforced Free Sheet-backed creation caps for budgets, goals, debts/piutang, Momental events, and bills while keeping reads, edits, and deletes available.
- Serialized Free record creation with short service-role-only per-user/feature locks so concurrent requests cannot exceed a cap.
- Extended `/api/me` with one batched Sheet count read and added Profile quota usage plus contextual 80%/100% warnings and accessible upgrade actions.
- Preserved form values on rejected creations and refreshed entitlement usage after successful creation/deletion/payment flows.

### Files Changed
- `src/lib/sheets.js`, `src/lib/transactionQuota.js`, `src/lib/transactionUndo.js`, `src/lib/writeClaims.js`, `src/lib/recordQuota.js`
- Transaction, budget, goal, debt, Momental, bill, and `/api/me` API routes
- Dashboard/Profile/Plan wiring and affected creation/payment modals
- `src/components/QuotaNotice.jsx`, `src/components/TransactionQuotaStatus.jsx`
- `supabase/008-phase3-feature-gating.sql` and focused Phase 3B-3C tests
- Phase 3 documentation and `progress.md`

### Verification
- Combined Phase 3A-3C focused suite: 19 files, 57 tests passed before final review fixes.
- Final affected Phase 3B-3C suite: 12 files, 43 tests passed.
- Production build passed and includes `/api/me` plus all gated routes.
- Full repository suite still has 14 pre-existing failures across stale `QuickAddSheet`, `Sheet`, and dashboard-cache tests; Phase 3 focused tests pass.

### Decisions
- Phase 3B-3C are locally implemented, but overall Phase 3 remains current and incomplete.
- Finance ledger and record counts remain sourced from each user's Google Sheet; Supabase stores entitlement, usage, replay claims, and temporary creation locks only.
- Transaction and automated-payment concurrency is protected without moving ledger data into Supabase.
- Locked Pro previews, history filtering, stable insights, PDF watermark enforcement, and Plan-tab splitting remain for later Phase 3 subphases.

### Blockers
- Apply the latest `supabase/008-phase3-feature-gating.sql` to the live Supabase project and smoke-test usage, write-claim, and creation-lock RPC authorization.
- Complete the remaining Phase 3 subphases and end-to-end Free → Pro → revoked verification before marking Phase 3 complete.
## 2026-07-29 — Phase 3D-3E remaining feature gating implemented

### Completed
- Added WIB four-month Free history filtering before dashboard aggregates and deterministic maximum-three weekly insights.
- Added static locked previews with upgrade links, Free PDF watermarking, Pro-only Year-in-Review, and the six-section Plan split.

### Verification
- Focused Phase 3D-3E tests passed. Live Supabase migration/RPC smoke tests and production entitlement E2E remain pending; Phase 3 is not marked complete.

## 2026-07-30 — Phase 3 feature gating completed

### Tasks Completed
- Marked Phase 3 complete and moved commercialization tracking to Phase 4 Polish + Hardening.
- Recorded final Phase 3 verification evidence across the operator/developer docs.

### Files Changed
- `AGENTS.md`
- `docs/Flow-system.md`
- `docs/commercialization-plan.md`
- `docs/commercialization-prompts.md`
- `supabase/README.md`
- `progress.md`

### Verification
- Supabase migration `008-phase3-feature-gating.sql` applied.
- Live Supabase RPC/REST auth tests passed.
- Production Free → Pro → Free revocation smoke passed.
- Admin permanent Pro already verified.
- `/api/me` and related routes are healthy.
- Full suite passed with 272 passed and 2 skipped.
- Production build passed.

### Decisions
- Phase 4 Polish + Hardening is now current.

### Blockers
- None for Phase 3 closure.

## 2026-08-01 — Phase 4 hardening discussion record created

### Completed
- Created the Phase 4 hardening discussion record with Critical, Important, Medium, and Nice to Know Phase 4 topics.
- Recorded agreed rate-limit scope, request limits, shared validation, health-check behavior, production environment handling, admin permissions, confirmation before disabling features, and global plus per-user feature-flag behavior.
- Recorded remaining recommendations for feature-flag storage, API enforcement, cache propagation, security headers, logging, exact environment validation, and acceptance checks.

### Decisions
- Feature switches may be global or targeted to selected users; users without an override inherit the global setting.
- Any normalized admin account may manage feature switches.
- Turning a feature off preserves user data and can be reversed.

### Blockers
- Phase 4 implementation and verification have not started.

## 2026-08-01 — Phase 4 hardening answers recorded

### Answers Recorded
- **C6:** Approved the existing global `feature_flags` table plus a separate user-override table.
- **C7:** Approved admin control for all user-facing product features, while keeping safety infrastructure protected.
- **C8:** Approved enforcement in both the UI and API/server.
- **C10:** Approved production fail-fast behavior for missing required environment settings and development warnings.
- **C11:** Approved the full Phase 4 implementation, security, test, build, and targeted-feature verification checklist as the completion gate.

### Blockers
- Phase 4 implementation and verification have not started.

## 2026-08-01 — Phase 4 hardening answers I1/I3/I4/I5 recorded

### Answers Recorded
- **I1:** Optional or risky features fail closed if their flag cannot be read; core ledger and authentication access remains available.
- **I3:** Successful feature-switch changes invalidate the short server cache immediately, with a short fallback cache still allowed.
- **I4:** Feature Controls will be added to the existing `/admin` area.
- **I5:** Disabled features are hidden; stale or direct access receives `Fitur sedang tidak tersedia.`.

### Blockers
- Phase 4 implementation and verification have not started.

## 2026-08-01 — Phase 4 hardening answers I6/I7/I9/I10 recorded

### Answers Recorded
- **I6:** Feature flags are resolved server-side; clients receive only the current user’s effective feature access.
- **I7:** The public NextAuth callback receives a separate IP-based rate limit.
- **I9:** Security headers remain in `next.config.js` without duplicate middleware headers.
- **I10:** Logging stays minimal and request-aware, with tokens, payment-proof URLs, full financial values, and unnecessary personal data excluded.
- **I11:** Remains open until the current environment variables are reviewed.

### Blockers
- Phase 4 implementation and verification have not started.
- I11 environment-variable confirmation is still pending.
- User review is still needed for the open recommendations in the discussion record.
- Remaining open recommendations are still recorded in the discussion record.

## 2026-08-01 — Phase 4 hardening answers I11/M1/M2/M3/M4/M6 recorded

### Answers Recorded
- **I11:** The Vercel screenshot confirms all 11 required environment-variable names are configured for Production and Preview. `SPREADSHEET_ID` is an extra legacy variable, not required by the per-user runtime; values were not inspected.
- **M1:** Approved the clear OFF confirmation explaining scope, data preservation, and reversibility.
- **M2:** Approved recording `updated_at` and `updated_by` without a full audit-history table in the first Phase 4 pass.
- **M3:** Approved email/name search with a small selectable result list.
- **M4:** Approved server-side feature-flag reads with only effective access returned to the signed-in user.
- **M6:** Approved the fast liveness/configuration health check without Google or Supabase network calls.

### Blockers
- Phase 4 implementation and verification have not started.
- I12 and M5, plus any remaining open topics, still need review.

## 2026-08-01 — Phase 4 Nice to Know answers recorded

### Answers Recorded
- **N1:** Approved deferring a separate full audit-history table; last-change metadata is enough for the first release.
- **N2:** Approved deferring Redis or distributed rate limiting until scaling evidence requires it.
- **N3:** Approved future-dated ON/OFF scheduling for global or targeted feature settings as a later enhancement.
- **N4:** Approved admin filters for supported user segments before applying targeted feature changes.
- **N5:** Approved keeping the short unavailable message and hidden feature while deferring branded maintenance pages.
- **N6:** Approved keeping switched-off feature code and data until a separate archive/removal decision is approved and verified.

### Blockers
- Phase 4 implementation and verification have not started.
- Future scheduling and user-segment filters are later enhancements, not Phase 4 blockers.

## 2026-08-01 — Phase 4 hardening implemented locally

### Tasks Completed
- Added shared request validation, safe request-aware logging, request IDs, normal/API-sensitive rate limits, production environment fail-fast validation, and a network-free `/api/health` endpoint.
- Added private global and per-user feature flags with protected system features, fail-closed optional flags, short caching with invalidation, one-time future schedules, and client-safe availability/access contracts.
- Added the `/admin` Feature Controls switchboard with global controls, OFF confirmations, per-user `Use global` reset, email/name/tier/account-age filters, and targeted scheduling.
- Enforced feature availability in affected UI and API routes while preserving existing user data and safe unavailable responses.
- Removed the unused direct `googleapis` dependency; the remaining lockfile copy is transitive through `@bubblewrap/core`.
- Synchronized the Phase 4 discussion, commercialization plan, system flow, Supabase setup notes, AGENTS instructions, and this progress record. `docs/commercialization-prompts.md` was intentionally not changed.

### Files Changed
- `src/lib/featureFlags.js`, `src/lib/featureAccess.js`, `src/lib/featureGuard.js`, `src/lib/rateLimit.js`, `src/lib/env.js`, `src/lib/validation.js`, `src/lib/logger.js`, `src/middleware.js`
- `src/app/api/health/route.js`, `src/app/api/admin/features/route.js`, `src/app/api/admin/users/route.js`, `src/app/admin/AdminFeatureControls.jsx`
- Affected API/dashboard/payment components, `supabase/009-phase4-feature-flag-foundation.sql`, and Phase 4 tests
- `AGENTS.md`, `docs/commercialization-plan.md`, `docs/Flow-system.md`, `supabase/README.md`, `progress.md`

### Verification
- Full suite: 66 test files passed, 305 tests passed, 2 repository smoke tests skipped.
- Production build: passed with all 11 required environment names supplied as temporary process values; no secret values were written to files.
- `git diff --check`: passed.

### Blockers
- Complete live admin authorization, global/user override inheritance, scheduled transition, disabled-feature, and release security/manual checks before marking Phase 4 complete.

## 2026-08-01 — Phase 4 feature-flag migration applied

### Verification
- The owner applied `supabase/009-phase4-feature-flag-foundation.sql` in the live Supabase SQL Editor.
- Read-only service-role verification confirmed the feature-flag rows, all current global defaults enabled, no current per-user overrides, and intact admin/user records.
- Anonymous Supabase access was denied for both `feature_flags` and `feature_flag_overrides` as intended.
- The configured Vercel health URL is protected by Vercel SSO and returned a redirect; no production state was changed by this check.

### Blockers
- Open `/admin` as the admin account and verify global OFF/ON, per-user OFF/inherit, future-dated transitions, segment filters, and disabled-feature behavior.
- Complete the remaining release security/manual checklist before marking Phase 4 complete.

## 2026-08-01 — Phase 4 Polish + Hardening completed

### Verification
- The owner confirmed deployment and completed the live global ON/OFF, per-user override/inheritance, `Gunakan global` reset, future-schedule, disabled-feature, data-preservation, and non-admin authorization checks.
- Phase 4 automated verification remains green: 66 test files passed, 305 tests passed, 2 tests skipped, and the production build passed.
- Phase 4 migration and public access-boundary checks passed; no feature-flag state was left overridden after the acceptance test.

### Status
- Marked Phase 4 complete in the commercialization tracker and Play Store release-blocker plan.
- Moved the current commercialization phase to Phase 5 Testing + Verification.
- `docs/commercialization-prompts.md` remains intentionally unchanged.

### Next Phase
- Run Phase 5 API/data-isolation/security verification on the canonical production domain after the planned UI/UX revamp and domain migration sequence.

## 2026-08-02 — Admin workspace revamp implemented

### Tasks Completed
- Replaced the stacked `/admin` view with a Payments-default workspace containing Payments, Pengguna, and Kontrol Fitur tabs; tab state is preserved in the URL.
- Added a server-paginated, filterable user directory with summary counts for total, Free, Pro, active-seven-day, and connected-Sheet users.
- Added a read-only responsive user detail panel with independently loaded account, verified transaction quota, payment history, and secure proof sections plus retry actions.
- Added throttled authenticated activity tracking through `users.last_seen_at`; opening authenticated Artami usage counts as active, while admin refresh only re-reads data.
- Added five-second top-right feature-change confirmations and persistent `updated_at`/`updated_by` display in Feature Controls.

### Files Changed
- `src/app/admin/page.js`, `src/app/admin/AdminShell.jsx`, `src/app/admin/AdminUsersClient.jsx`, `src/app/admin/AdminFeatureControls.jsx`
- `src/app/api/admin/users/route.js`, `src/app/api/admin/users/[id]/route.js`, `src/app/api/admin/features/route.js`
- `src/lib/activity.js`, `src/lib/adminUsers.js`, `src/lib/apiAuth.js`, `src/lib/paymentAuth.js`, `src/lib/featureFlags.js`, `src/app/dashboard/_components/Toast.jsx`
- `supabase/010-admin-user-activity.sql`, `docs/Flow-system.md`, `supabase/README.md`, `AGENTS.md`
- Admin activity, API, helper, shell, user-directory, feature metadata, and toast tests

### Decisions
- Activity writes are guarded to one write per user per five minutes; no browser heartbeat or admin-triggered activity write is added.
- The user panel never reads Google Sheets and never exposes spreadsheet IDs or storage proof paths.
- Supabase-verifiable transaction usage is shown; Sheet-backed record counts remain explicitly unavailable in this panel.

### Verification
- Focused activity, admin API/helper, feature-control, toast, shell, and user-directory tests pass.
- Full repository suite passed with 72 test files, 326 tests passed, and 2 skipped; the production build passed with the new `/admin` and user-detail routes.

## 2026-08-02 — Per-user categories implemented

### Tasks Completed
- Added versioned `categories_v1` settings stored in each user's Google Sheet; new Sheets receive Indonesian starter categories while existing Sheets retain legacy lists until customized.
- Added Profile > Preferensi > Kategori manager for expense, income, and savings categories with icons, archive/restore, recommendations, and savings liquidity classification.
- Routed configured categories through transaction, budget, goal, bill, recap, and edit pickers; protected `Utang`/`Piutang` for automated debt payments.
- Updated Health Score and monthly reports to use each user's active liquid savings categories.

### Files Changed
- `src/lib/categories.js`, `src/app/api/settings/route.js`, `src/lib/sheetManager.js`, `src/lib/useSharedData.js`
- `src/components/CategoryManager.jsx`, dashboard category pickers, category visuals, Health Score/report components
- Category/settings/Health Score tests, `docs/sheets-settings.md`, `docs/Flow-system.md`, `AGENTS.md`

### Decisions
- All three category groups are customizable with no business quota; categories can be added or archived, not renamed/deleted.
- Existing transaction history remains unchanged; archived categories remain available when editing historical records.

### Verification
- Focused category/integration suite: 45 tests passed; additional component suites: 12 passed/2 skipped; additional API/lib suites: 41 passed.
- Full repository suite: 75 test files passed, 340 tests passed, and 2 smoke tests skipped.
- Production build passed with temporary process-only values for the 11 required environment variable names; no secrets were written.

## 2026-08-04 — User name settings implemented

### Tasks Completed
- Added optional per-user `Nama pengguna` storage in the Google Sheets `Settings` tab with trimmed Unicode validation, clearing behavior, and first-use dismissal state.
- Added the reusable first-use prompt and Profile > Identitas Akun editor, prefilled from the current Google name and still usable when the Google name is unavailable.
- Applied the effective name fallback (saved Artami name → Google name → email) across the dashboard greeting, Profile, legacy Sheet connection, monthly PDF, monthly HTML report, and annual HTML report.
- Documented the user-name flow and cross-device dismissal behavior in `docs/Flow-system.md`.

### Files Changed
- `src/app/api/settings/route.js`, `src/lib/useSharedData.js`, `src/lib/userDisplayName.js`
- `src/components/UserNameSetup.jsx`, dashboard `page.js`, `ProfileTab.jsx`, `StatsTab.jsx`, `LegacySheetConnector.jsx`
- `src/lib/report.js`, `src/lib/reportPdf.js`, report buttons, and related tests
- `docs/Flow-system.md`, `progress.md`

### Decisions
- The Artami display name is separate from Google, Supabase, and spreadsheet title identity.
- The saved name is optional, limited to 60 trimmed Unicode characters, and clearing it restores the fallback while making the first-use prompt eligible again.
- `Nanti` is persisted in the user's Settings sheet; Settings load errors suppress the prompt and save errors preserve the typed value.

### Verification
- Focused name-feature suite: 6 files passed, 31 tests passed.
- Full repository suite: 85 test files passed, 380 tests passed, and 2 existing smoke tests skipped.
- Production build passed with temporary process-only values for the 11 required environment variable names; no secrets were written.

## 2026-08-07 — Next-month cash-flow forecast implemented

### Tasks Completed
- Replaced the old short-window forecast with a single expected next-month projection using up to six complete months of history.
- Added stable/irregular income handling, robust expense baselines, scheduled bill recurrence, bill-payment double-count protection, and minimum-data fallbacks.
- Wired forecast data, bills, transactions, loading/error state, and refresh behavior through the dashboard and plan surfaces.
- Hardened transaction update/delete ID validation and preserved untouched transaction columns during edits.
- Simplified the forecast chart to actual surplus plus one dashed projected connector and added the formula note link.

### Files Changed
- `src/lib/forecast.js`, `src/lib/bills.js`, `src/lib/useSharedData.js`
- `src/components/CashFlowForecast.jsx`, `src/components/BillsSection.jsx`
- `src/app/dashboard/page.js`, `src/app/dashboard/StatsTab.jsx`, `src/app/dashboard/PlanTab.jsx`
- `src/app/api/transaction/[id]/route.js`
- Forecast, bill, dashboard, and transaction API tests

### Decisions
- Forecasts use up to six complete months, excluding the current partial month; gaps are not treated as zero.
- Stable income requires at least 5 of 6 positive months with CV `<= 0.25`; irregular income uses the median.
- Scheduled `Cicilan/Kredit` bills are included, while raw `Utang` balances are not.
- The UI shows one expected forecast without confidence bands or alternative scenarios.

### Verification
- Full repository suite: 88 test files passed, 436 tests passed, and 2 tests skipped.
- Production build passed with temporary process-only values for the required environment variable names; no secrets were written.

## 2026-08-08 — Prevent repeated user-name prompt after Settings read errors

### Tasks Completed
- Fixed `/api/settings` so Google Sheets read failures return an error instead of an empty settings object.
- Preserved the dashboard guard that suppresses the `Nama pengguna` prompt when Settings cannot be loaded; a saved name is never treated as missing because of a transient read failure.
- Added a regression test covering the failed Settings read path.

### Files Changed
- `src/app/api/settings/route.js`
- `tests/api/settingsRoute.test.js`
- `progress.md`

### Verification
- Name-feature regression suite: 6 files passed, 32 tests passed.
- Full repository suite passed with exit code 0.
- Production build passed with temporary process-only values for the required environment variable names; no secrets were written.

## 2026-08-08 - Special expense analytics design approved

### Tasks Completed
- Explored the existing transaction, recap, Stats, anomaly, forecast, Health Score, insight, Goal, and report flows.
- Defined the approved `Pengeluaran Spesial` model: actual accounting remains complete while routine behavioral analytics exclude special expenses.
- Wrote the implementation-ready design specification.

### Files Changed
- `docs/superpowers/specs/2026-08-08-special-expense-analytics-design.md`
- `progress.md`

### Decisions
- Store `Rutin` or `Spesial` in `Pengeluaran!P:P`; blank legacy cells mean `Rutin`.
- Actual totals, net worth, budgets, quota, and ledger visibility include Spesial expenses.
- Routine trends, averages, anomaly alerts, forecast baselines, selected Health Score factors, and stable insights exclude them.
- Classification is manual with a non-binding suggestion only; Goals are not involved.

### Blockers
- Implementation is paused until the user reviews the written specification.

## 2026-08-08 - Special expense analytics implemented and verified

### Tasks Completed
- Added the `Pengeluaran!P:P` `Sifat` schema, lazy header migration, normalized class handling, and expense-only API persistence with default `Rutin` behavior.
- Preserved actual dashboard accounting while adding routine aggregates; routed anomaly alerts, forecasts, selected Health Score factors, savings trends, and stable insights to routine expenses.
- Added expense entry/edit controls, opt-in special suggestions, recap class filters and totals, special badges, and Stats `Rutin | Aktual` analysis mode.
- Added actual/routine/special monthly and annual HTML/PDF report sections, including visible special-purchase sections and actual budget spending.
- Synchronized the active schema and actual-versus-routine rules in the project flow documentation.

### Files Changed
- Expense schema/API/analytics: `src/lib/expenseClass.js`, Sheet helpers, transaction routes, dashboard aggregation, routine smart analytics, and focused tests.
- Dashboard UI/report surfaces: entry/edit/recap/Stats/Home components, report generators/buttons, and focused tests.
- Documentation: `AGENTS.md`, `docs/Flow-system.md`, `docs/sheets-momental.md`, and this progress record.

### Decisions
- `Pemasukan` and `Tabungan` remain A:O; `Pengeluaran` is A:P with `Sifat` in P.
- Actual totals, balances, net worth, budgets, quota, calendar totals, and ledger visibility include `Spesial`; routine behavioral analytics exclude it.
- Classification is manual with a non-binding suggestion; blank or unknown legacy values normalize to `Rutin`.

### Verification
- Feature-focused suite: 13 files passed, 94 tests passed.
- Full repository suite: 95 files passed, 471 tests passed, 2 tests skipped; 1 smoke file skipped by design.
- Production build passed with process-only placeholder environment values; no secrets were written.

### Blockers
- `docs/commercialization-prompts.md` had a pre-existing large dirty rewrite. Its single stale expense-schema line was updated in place but was intentionally not staged, so the unrelated rewrite remains preserved for its owner.

## 2026-08-08 - Move and refine Statistik financial summary

### Tasks Completed
- Moved the financial summary to the first content position after the Statistik section tabs within Ringkasan.
- Reworked the hero into a compact dark summary card with a dominant result, clear Pemasukan/Pengeluaran cells, and dynamic Surplus, Defisit, or Seimbang states.
- Added focused coverage for placement, period context, financial states, scoped rendering, and compact loading behavior.

### Files Changed
- `src/app/dashboard/StatsTab.jsx`
- `tests/components/StatsTab.test.jsx`
- `progress.md`

### Decisions
- Kept the existing filter and analysis-mode sections unchanged.
- Deficit values display as absolute amounts because the Defisit label communicates direction.
- The summary remains scoped to the Ringkasan subsection; Insights and Anomaly Alerts follow it.

### Verification
- Focused StatsTab suite: 19 tests passed.
- Full repository suite: 95 files passed, 1 skipped; 478 tests passed, 2 skipped.

### Blockers
- Production build stopped at the existing fail-fast environment check because `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are not configured in this workspace.

## 2026-08-09 - Integrate and harden V2 landing page

### Tasks Completed
- Integrated the V2 landing page at `/` using a route group, with server-side signed-in redirect to `/dashboard` and auth-aware Pro navigation.
- Preserved same-origin routes, Rp40.000 lifetime pricing, Play Store coming-soon state, existing providers, and unrelated dashboard/API behavior.
- Added regression coverage for landing content, route isolation, mobile navigation focus, auth-loading fallback navigation, and light-surface contrast.
- Fixed reviewed accessibility and interaction findings: muted/clay contrast, mobile menu focus restoration, and loading CTA navigation.

### Files Changed
- `src/app/(landing)/page.js`, `src/app/(landing)/layout.js`, `src/app/landing.css`
- `src/components/landing/`
- `src/lib/landingContent.js`, `src/lib/landingLinks.js`
- `tests/landingPage.test.js`, `tests/components/LandingNavigation.test.jsx`
- `package.json`, `package-lock.json`, `src/app/layout.js`, and this progress record

### Decisions
- Kept landing-specific fonts and CSS inside the `(landing)` route group instead of loading them through the root layout.
- Allowed native CTA navigation while authentication status is loading; signed-out users still enter Google sign-in with `/upgrade` as the callback.
- Returned focus to the persistent mobile menu button after closing the menu so focus never remains inside a hidden container.

### Verification
- Landing-focused suite: 9 tests passed.
- Full repository suite: 97 files passed, 487 tests passed, 2 tests skipped; 1 smoke file skipped by design.
- Production build passed with process-only placeholder environment values; no secrets were written.
- Final scoped code review reported no remaining findings.

### Blockers
- Browser visual verification was unavailable because the `agent-browser` command is not installed in this workspace.

## 2026-08-09 - Prepare Netlify and Artami domain migration

### Tasks Completed
- Added host-specific Netlify redirects for HTTP and HTTPS requests from `ultah.biz.id` and `www.ultah.biz.id` to `https://artami.web.id`.
- Updated active TWA and Android source references to use `artami.web.id`.
- Added the complete Netlify, Google OAuth/Picker, IDwebhost DNS, acceptance, rollback, Vercel retirement, and Free-plan monitoring guide.

### Files Changed
- `netlify.toml`
- `twa-manifest.json`
- `scripts/generate-twa.js`
- `scripts/create-android-project.js`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/artami/app/MainActivity.java`
- `android/app/src/main/res/xml/network_security_config.xml`
- `docs/netlify-migration-guide.md`
- `progress.md`

### Decisions
- Use Netlify Free with GitHub `main` deployment and Netlify DNS.
- Use `https://artami.web.id` as the canonical apex URL; redirect `www` to the apex.
- Retain Vercel/default-host compatibility for previously released TWA builds until they are no longer supported.
- Do not modify generated Android build artifacts or unrelated existing worktree changes.

### Verification
- Phase 1 migration validator passed.
- Full repository suite: 97 files passed, 488 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four variables absent from local `.env.local`; no secrets were written.
- Guide ASCII check and `git diff --check` passed.

### Blockers
- Netlify project creation, environment-variable entry, Google Cloud updates, IDwebhost nameserver delegation, DNS propagation, and production acceptance remain manual deployment steps.
- A plain local production build still fails fast until the four missing local environment variables are configured; this does not affect the committed migration files.

## 2026-08-09 - Calm Living Ledger Batch 2 implemented

### Tasks Completed
- Added reusable `FeatureEducation` cards and wired the Target, Anggaran, and Tagihan empty states to explain their setup flow before the primary CTA.
- Normalized visible planning labels and completion copy while preserving internal section keys, callbacks, loading/error behavior, feature gates, and modal flows.
- Added the `Data Milikmu` profile section, Indonesian preference/account labels, and forest/neutral ordinary actions while keeping the Pro upgrade CTA violet.
- Raised touched planning controls to 44px minimum targets and replaced touched `transition-all` utilities with explicit transitions.

### Files Changed
- `src/components/FeatureEducation.jsx`
- `src/components/GoalsSection.jsx`
- `src/components/BudgetsSection.jsx`
- `src/components/BillsSection.jsx`
- `src/components/GoalCard.jsx`
- `src/components/BudgetCard.jsx`
- `src/app/dashboard/PlanTab.jsx`
- `src/app/dashboard/ProfileTab.jsx`
- Focused component tests under `tests/components/`
- `progress.md`

### Verification
- TDD red run completed before implementation: 8 focused files failed as expected.
- Focused component suite: 8 files passed, 47 tests passed.
- Focused regression suite: 4 files passed, 24 tests passed; one pre-existing `act(...)` warning remains in `BudgetStatusCard.test.jsx`.
- Full suite and production build were intentionally not run per task instructions.

### Blockers
- None.

## 2026-08-10 - Calm Living Ledger copy and navigation polish

### Tasks Completed
- Differentiated Statistik income and expense summary cards with semantic icons and sage/clay treatments.
- Added familiar icons to the Rencana navigation while preserving section keys, feature gates, callbacks, and touch targets.
- Applied the approved everyday Indonesian copy across Beranda, Statistik, Rencana, Profil, and feature education states.
- Added and updated focused regression coverage for the UI labels, icon presence, accessibility labels, and feature visibility.

### Files Changed
- `src/app/dashboard/HomeTab.jsx`
- `src/app/dashboard/PlanTab.jsx`
- `src/app/dashboard/ProfileTab.jsx`
- `src/app/dashboard/StatsTab.jsx`
- `src/components/BillsSection.jsx`
- `src/components/BudgetsSection.jsx`
- `src/components/GoalsSection.jsx`
- Focused component tests under `tests/components/`
- `progress.md`

### Decisions
- Kept visible Statistik label `Semua` mapped to the existing internal `actual` key.
- Kept backend contracts, calculations, feature gates, animations, and reduced-motion behavior unchanged.
- Used `Insights` and `Quick actions` only where explicitly approved; normalized the accessibility label to `semua insights`.

### Verification
- Focused suite: 9 files passed, 76 tests passed.
- Full repository suite: 102 files passed, 531 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four missing local production variables; no secrets were written.
- Scoped `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review found no blocking findings.

### Blockers
- None. Unrelated worktree changes remain untouched and are not part of this task.

## 2026-08-09 - Calm Living Ledger final verification and review fixes

### Tasks Completed
- Completed the Calm Living Ledger dashboard revamp across Beranda, Statistik, Rencana, Profil, sync status, education states, and visual tokens.
- Fixed feature access to fail closed while dashboard entitlement is unresolved or unverifiable.
- Fixed Statistik routine takeaways to use routine totals and made category trend text alternatives choose the latest populated period.
- Wrapped shared budget-cache test resets in `act()` so the new cache test is warning-free.

### Files Changed
- Dashboard UI and shared access: `src/app/dashboard/page.js`, `src/app/dashboard/StatsTab.jsx`, `src/lib/featureAccess.js`
- Regression coverage: `tests/components/StatsTab.test.jsx`, `tests/components/featureVisibility.test.jsx`, `tests/lib/featureAccess.test.js`, `tests/lib/useSharedData.test.js`
- `progress.md`

### Decisions
- Kept the existing Recharts animation behavior unchanged per owner instruction; the reduced-motion review suggestion was explicitly declined.
- Preserved legacy behavior for isolated components that omit the entitlement prop while failing closed for the dashboard's `null` or unverified entitlement state.

### Verification
- Adjacent dashboard suite: 7 files passed, 63 tests passed, with no cache-test act warnings.
- Full repository suite: 102 files passed, 526 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder environment values; no secrets were written.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review confirmed no remaining blocking findings in the accepted scope.

### Blockers
- None for this task. Unrelated pre-existing worktree changes and the unrelated `BudgetStatusCard` act warning remain untouched.

## 2026-08-09 - Lean implementation workflow policy

### Tasks Completed
- Added a scope-controlled implementation workflow to `AGENTS.md`.
- Defined instruction precedence between project rules, skills, and agent defaults.
- Added risk tiers, batch ownership, focused verification, one final review, and one integration gate.
- Added explicit handling for unrelated findings, pre-existing failures, and preserving completed work.

### Files Changed
- `AGENTS.md`
- `progress.md`

### Decisions
- Apply the lean workflow to all implementation work by default.
- Require exactly one independent final diff review for every implementation task.
- Keep stricter focused checks for finance, auth, payments, quotas, migrations, tenant isolation, and security.
- Do not allow skills to expand scope or duplicate reviews, tests, builds, agents, or commits.

### Blockers
- None.

## 2026-08-11 - Statistik and Rencana refinement

### Tasks Completed
- Removed the duplicate Statistik `Ringkasannya` section so `Kondisi Keuangan` remains the single summary surface.
- Added distinct expense-category colors, matching markers, locale-aware expense percentages, and a complete horizontally scrollable two-month category comparison chart with nominal labels; the comparison visualization was subsequently refined to grouped bars.
- Added semantic Rencana icon/card tones, stronger overview-card affordances, and visible `Buka` actions.
- Added first-use Utang/Piutang education with the existing setup-modal CTA.
- Added the approved design spec and implementation plan.

### Files Changed
- `src/app/dashboard/StatsTab.jsx`
- `src/app/dashboard/PlanTab.jsx`
- `src/components/DebtsSection.jsx`
- Focused tests under `tests/components/`
- `docs/superpowers/specs/2026-08-11-statistik-rencana-refinement-design.md`
- `docs/superpowers/plans/2026-08-11-statistik-rencana-refinement.md`
- `progress.md`

### Decisions
- Kept existing Recharts, semantic tokens, feature gates, internal keys, calculations, API behavior, and motion behavior unchanged.
- Used all prepared comparison categories rather than limiting the chart to five.
- Kept the second comparison series below its points and applied explicit primary-text label contrast.

### Verification
- Focused integration suite: 3 files passed, 48 tests passed.
- Full repository suite: 102 files passed, 537 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- Scoped `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review and bounded correction review found no remaining findings.

### Blockers
- None for this task. Browser CLI QA was unavailable; component tests and production build passed. Unrelated worktree changes remain untouched.

## 2026-08-15 - Statistik comparison grouped bars

### Tasks Completed
- Replaced the two-month category comparison line chart with a grouped vertical bar chart.
- Kept all comparison categories, combined-value descending order, zero-filled month values, horizontal scrolling, tooltip, legend, and accessible summary behavior.
- Added visible Rupiah Y-axis ticks and nominal labels above both selected-month bars.
- Updated the approved Statistik design specification and implementation plan.

### Files Changed
- `src/app/dashboard/StatsTab.jsx`
- `tests/components/StatsTab.test.jsx`
- `docs/superpowers/specs/2026-08-11-statistik-rencana-refinement-design.md`
- `docs/superpowers/plans/2026-08-15-statistics-comparison-grouped-bars.md`
- `progress.md`

### Decisions
- Use adjacent month bars, not layered or stacked bars; sort remains based on combined expense across both selected months.
- Keep unrelated worktree changes untouched and outside this task.

### Verification
- Focused StatsTab suite: 27 tests passed.
- Full repository suite: 103 files passed, 555 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- Scoped `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent scoped diff review found no remaining chart or test findings after bounded corrections.

### Blockers
- None for this task. Browser CLI QA was unavailable; unrelated worktree changes remain untouched.

## 2026-08-13 - Financial Freedom simulation rebuilt

### Tasks Completed
- Rebuilt the Pro-only Financial Freedom simulation with Indonesian-first target, ETA, progress, projection, formula, and uncertainty copy.
- Added conservative calculation helpers using up to 12 completed WIB expense months, actual surplus, null-safe net worth handling, custom target-basis persistence, and current-month projection anchoring.
- Added an explicit target reference line and accessible chart summary; corrected duplicate current-month history points.

### Files Changed
- `src/lib/financialFreedom.js`, `src/components/FITrackerCard.jsx`
- `src/app/api/settings/route.js`, `src/lib/useSharedData.js`, `src/app/dashboard/PlanTab.jsx`, `src/app/dashboard/page.js`
- Financial Freedom, settings, and Plan-tab tests; `docs/sheets-settings.md`
- `progress.md`

### Verification
- Focused Financial Freedom/component suite: 4 files passed, 39 tests passed.
- Settings API suite: 17 tests passed.
- Full repository suite after final corrections: 103 files passed, 555 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder environment values; no secrets were written.
- Independent final diff review found and confirmed fixes for the explicit target reference line and duplicate current-month chart point.
- `git diff --check` passed before final verification; only existing CRLF conversion warnings were reported.

### Decisions
- Kept the implementation limited to the existing Simulasi surface and existing `financialIndependence` entitlement gate.
- Left unrelated worktree changes untouched; no commit was created.

### Blockers
- None for this task. Browser visual QA was not available in the workspace.

## 2026-08-16 - Comparison chart label and color key refinement

### Tasks Completed
- Reduced the comparison bar-value labels to `9px`.
- Replaced the ambiguous automatic legend with a custom color key below the X-axis.
- Added dynamic primary/comparison month markers and the caption `Keduanya menunjukkan pengeluaran` so users understand both series are expenses.

### Files Changed
- `src/app/dashboard/StatsTab.jsx`
- `tests/components/StatsTab.test.jsx`
- `docs/superpowers/specs/2026-08-11-statistik-rencana-refinement-design.md`
- `docs/superpowers/plans/2026-08-15-statistics-comparison-grouped-bars.md`
- `progress.md`

### Decisions
- Keep the color key inside the horizontally scrollable chart surface directly below the X-axis.
- Keep the month colors dynamic and preserve all existing comparison data and controls.
- Leave unrelated worktree changes untouched; keep this follow-up limited to the chart refinement.

### Verification
- Focused StatsTab suite: 27 tests passed.
- Full repository suite: 103 files passed, 555 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.

### Blockers
- None for this task. Browser visual QA was unavailable; unrelated worktree changes remain untouched.

## 2026-08-16 - Ringkasan rolling-average curves

### Tasks Completed
- Replaced the Ringkasan chart's straight average reference lines with two smooth rolling-average curves.
- Added 3-month rolling income and expense values using the current month plus up to the previous two plotted months.
- Updated the chart legend, tooltip series, and accessible summary to describe the moving averages.

### Files Changed
- `src/app/dashboard/_components/statsPeriod.js`
- `src/app/dashboard/StatsTab.jsx`
- `tests/lib/statsPeriod.test.js`
- `tests/components/StatsTab.test.jsx`
- `progress.md`

### Decisions
- Kept the bars and all existing filter, mode, visibility, and empty-state behavior unchanged.
- Used plotted data periods rather than calendar gaps for the rolling window.
- Left the correction uncommitted and unpushed pending explicit review/push approval.

### Verification
- Focused suites: 36 tests passed.
- Full repository suite: 103 files passed, 559 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review found no blocking findings.

### Blockers
- None for this task. Browser visual QA was unavailable; unrelated worktree changes remain untouched.

## 2026-08-16 - Ringkasan monthly cash-flow chart

### Tasks Completed
- Added a Ringkasan-only monthly cash-flow chart beneath the existing Kondisi Keuangan card.
- Showed side-by-side Pemasukan and Pengeluaran bars with separate monthly average reference lines.
- Kept the chart hidden for a single selected month and added an empty state for periods without cash-flow data.
- Preserved all Statistik filters, Rutin/Semua mode, the existing Tren chart, forecast, and summary card.

### Files Changed
- `src/app/dashboard/_components/statsPeriod.js`
- `src/app/dashboard/page.js`
- `src/app/dashboard/StatsTab.jsx`
- `tests/lib/statsPeriod.test.js`
- `tests/components/StatsTab.test.jsx`
- `progress.md`

### Decisions
- Grouped chart data by chronological year-month so `Semua Tahun` does not merge the same month across years.
- Calculated averages over plotted months with income or expense data, including zero values for the other series.
- Left unrelated worktree changes untouched; no commit was created.

### Verification
- Focused suites: 36 tests passed.
- Full repository suite: 103 files passed, 559 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review found no blocking findings.

### Blockers
- None for this task. Browser visual QA was unavailable; unrelated worktree changes remain untouched.

## 2026-08-17 - Rebuild Artami APK for canonical domain

### Tasks Completed
- Bumped the Android release to version `1.0.3` with `versionCode 4`.
- Built a signed release APK from the Android TWA project.
- Replaced the website-served APK and synchronized root APK with the new release artifact.
- Confirmed the packaged APK launches `https://artami.web.id/dashboard` and no longer embeds the old `ultah.biz.id` host.

### Files Changed
- `android/app/build.gradle`
- `scripts/create-android-project.js`
- `scripts/generate-twa.js`
- `twa-manifest.json`
- `public/artami.apk`
- `artami.apk`
- `progress.md`

### Decisions
- Preserved package ID `com.artami.app`, `/dashboard` launch path, and the existing signing certificate so the release remains an upgrade of the installed app.
- Kept unrelated pre-existing worktree changes untouched.

### Verification
- Clean signed release build passed: `assembleRelease`.
- APK metadata: package `com.artami.app`, version code `4`, version `1.0.3`.
- Packaged manifest: host `artami.web.id`, launch URL `https://artami.web.id/dashboard`.
- Release APK is not debuggable.
- APK signature verification passed with the existing asset-links certificate fingerprint.
- Root, public, and release-output APK SHA-256 hashes match.
- Full repository suite: 103 files passed, 559 tests passed, 1 file skipped, 2 tests skipped.

### Blockers
- None for this task.

## 2026-08-17 - Remove sync info affordance

### Tasks Completed
- Removed the info icon beside the synchronization status.
- Removed the associated synchronization info sheet, text constant, state, handler, and unused imports.
- Preserved refresh behavior, synchronization status text, loading/offline states, haptics, and accessibility labels.
- Updated the approved Beranda design record and regression coverage.

### Files Changed
- `src/app/dashboard/_components/SyncStatus.jsx`
- `tests/components/SyncStatus.test.jsx`
- `docs/superpowers/specs/2026-08-09-artami-calm-living-ledger-design.md`
- `progress.md`

### Decisions
- Keep Google Sheets ownership explanations in their existing dedicated surfaces; remove only the separate synchronization-row affordance.
- Leave unrelated worktree changes untouched; no commit was created.

### Verification
- Focused SyncStatus suite: 6 tests passed.
- Full repository suite: 103 files passed, 561 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for the four absent local production variables; no secrets were written.
- Independent scoped diff review found no blocking findings.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.

### Blockers
- None for this task. Browser visual QA was unavailable; unrelated worktree changes remain untouched.

## 2026-08-17 - Clarify piutang receiving actions

### Tasks Completed
- Replaced misleading piutang `Bayar` actions with direction-aware `Terima` labels.
- Updated piutang modal headings, amount labels, progress copy, validation, notifications, and full-settlement confirmations.
- Updated debt first-use education to cover both payments and receipts.
- Added regression coverage for piutang card and payment-modal wording.

### Files Changed
- `src/components/DebtCard.jsx`
- `src/components/DebtPaymentModal.jsx`
- `src/components/DebtsSection.jsx`
- `tests/components/DebtManagement.test.jsx`
- `tests/components/dataSectionsErrors.test.jsx`
- `progress.md`

### Decisions
- Kept `Bayar` for utang and used `Terima` for piutang.
- Preserved all API, Google Sheets, quota, idempotency, and accounting-direction behavior.
- Left unrelated worktree changes untouched; no commit was created.

### Verification
- Focused component checks: 10 tests passed.
- Debt payment API checks: 4 tests passed.
- Full repository suite: 103 files passed, 561 tests passed, 1 file skipped, 2 tests skipped.
- Production build passed with process-only placeholder values for four absent local production variables; no secrets were written.
- `git diff --check` passed; only existing CRLF conversion warnings were reported.
- Independent final diff review found no blocking findings.

### Blockers
- None for this task.

---

## Session — 2026-08-23: MD3 UI/UX Update Plan Document

### Tasks Completed
- Ran Material Design 3 audit via UI Designer + UX Architect subagents against current dashboard source.
- Produced approved MD3 update plan (Batches A-E) with locked decisions: bottom nav stays fixed, glass contained to nav/header/sheets, dark mode completed properly, routing deferred.
- Wrote full implementation plan to docs/MD3-ui-plan.md (task contract, findings with file:line evidence, batch tables with acceptance criteria, verification gates, gotchas, before/after mockups, RN-port compatibility notes).

### Files Changed
- docs/MD3-ui-plan.md (new)
- progress.md (this entry)

### Decisions
- Navigation rail rejected; bottom navigation permanent at all screen sizes.
- Optional add-ons (search view, FAB speed-dial, morphing FAB, seed theme picker) remain out of scope unless later approved.

### Blockers
- None. Implementation not started per user instruction.

---

## Session — 2026-08-23: MD3 UI/UX Update Implementation (Batches A-E)

### Tasks Completed
- Implemented the approved MD3 plan (docs/MD3-ui-plan.md) end-to-end via sequential implementation subagents:
  - **Batch A** quick wins: dead WalletTab deleted + shared SpecialExpenseField; nav active-pill + 11px labels; Toast -> flat inverse-surface snackbar (no countdown/gradient); one .btn-filled replacing all gradient submits; chips -> secondary-container swap + checkmark; Pencil/X lucide icons with >=44px targets; FAB unified 56dp primary-container; PTR dismisses on fetch settle (400ms min-hold); sheet drag handles; SelectField focus ring; QuotaNotice banner anatomy; a11y floor (>=11px text, suffix contrast, tabular-nums sweep).
  - **Batch B** token foundation: 29 --md-sys-color-* roles in :root seeded from existing violet/earth palette; tailwind colors.md3.* mapping; pure-JS src/lib/designTokens.js (RN-safe); src/lib/chartTheme.js applied to all StatsTab charts, heatmap clay ramp, today-ring primary; GoalProgressRing tokens.
  - **Batch C**: motion tokens (--ease-emphasized family, slide-up/down keyframes, reduced-motion fallbacks); .field-outlined spec applied to 12 fields; SegmentedButtons primitive shipped+tested (period filters were already SelectFields, so unwired); all 6 create modals confirmed ALREADY bottom sheets (C1 no-op).
  - **Batch D**: two-line transaction rows w/ category avatar circles + inset dividers (HomeTab recent + drill-down); RowActionsMenu (body-portal, mousedown-only outside click) replacing edit/delete pairs on drill-down/BudgetCard/GoalCard; semibold money hierarchy; bills badge (overdue+due_today, 9+ cap) on Rencana nav + requestNotificationPermission once after first successful pay; header scroll-away via existing rAF listener (inert-safe); QuickAdd recent-category suggestion chips prefilling kategori+akun.
  - **Batch E** dark mode: full [data-theme=dark] remap of all 29 roles + legacy semantic vars + glass/chip/selection overrides; Terang/Gelap/Sistem toggle in ProfileTab Pengaturan persisted to localStorage artami-theme; FOUC-safe inline bootstrap in layout.js; E3 raw-class sweep across ~60 dashboard/components files; prefers-contrast block; designTokens.js themes export.
- Reviewer blocking findings fixed in-gate: GoalProgressRing track tokenized via style-prop var(); countUrgentBills() extracted to helpers.js + 5 unit tests.

### Files Changed
- ~80 files under src/app/dashboard/**, src/components/**, src/lib/**, globals.css, tailwind.config.js, layout.js, tests/**
- Deleted: src/app/dashboard/WalletTab.jsx, tests/components/WalletTab.test.jsx
- New: SpecialExpenseField.jsx, designTokens.js, chartTheme.js, SegmentedButtons.jsx (+test), RowActionsMenu.jsx, helpers.badge.test.jsx
- docs/MD3-ui-plan.md created earlier this session as source of truth.

### Decisions
- Bottom nav stays fixed-bottom everywhere (rail rejected by user).
- Glass contained per invariant; RowActionsMenu uses glass-strong mirroring SelectField dropdown precedent (recorded as invariant-wording follow-up).
- Charts read module-scope hexes; dark mode gives chart panels explicit light card bg (reactive chart theming deferred).
- .btn-filled keeps brand green in dark (--primary not remapped) for contrast safety.
- SegmentedButtons unwired until a suitable mutually-exclusive control needs it.

### Verification
- Focused checks after each batch: components/app suites 240 -> 250 passing across batches.
- Independent final diff review (code-reviewer subagent): BLOCK x2 -> bounded corrections -> APPROVE.
- Full repository suite: 104 files passed, 569 tests passed, 1 file skipped, 2 tests skipped (pre-existing Dashboard.smoke skips).
- Production build passed with process-only placeholder values for four absent local production variables; no secrets written.
- git diff --check clean (existing CRLF warnings only).

### Blockers
- None. Recorded follow-ups (non-blocking): earth-400 accent rename to md3 token, SavingsRateTrend tick -> chartTheme, StatsTab heatmap empty-color import nit, nav pill -> secondary-container token, BillSetupModal/EventSetupModal field-outlined adoption, theme-toggle automated coverage, manual dark-mode visual pass on device.

---

## Session — 2026-08-25: Freeze Y-Axis on All-Month Cash-Flow Chart

### Tasks Completed
- Split the all-month “Pemasukan vs Pengeluaran” chart into a fixed Rupiah Y-axis column and a horizontally scrollable monthly plot.
- Kept bars, rolling-average lines, tooltips, month labels, and the accessible chart summary intact.
- Added a regression test covering the fixed-axis/scroll-viewport structure.

### Files Changed
- `src/app/dashboard/StatsTab.jsx`
- `tests/components/StatsTab.test.jsx`
- `progress.md`

### Decisions
- Both chart instances use the same explicit Y-axis domain so the fixed labels stay aligned with the scrolled data.
- The change applies only when the month filter is “Semua Bulan”; other charts and filters are unchanged.

### Verification
- Focused StatsTab suite: 31 passed.
- Full repository suite: 104 files passed, 1 skipped; 570 tests passed, 2 skipped.
- Independent final diff review: no blocking findings.
- `git diff --check`: clean for the task files (existing CRLF warnings only).

### Blockers
- Local production build is blocked by the repository’s production fail-fast check because four required environment variables are not present: `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`.

---

## Session — 2026-08-27: Active Bottom Navigation Pills

### Tasks Completed
- Updated the bottom navigation so only the active tab reveals its Indonesian label inside an expanding MD3 violet pill.
- Kept the warm glass floating shell, tab semantics, haptics, Rencana overview reset, and urgent-bill badge.
- Added a focused regression assertion for active/inactive label and spacing behavior.

### Files Changed
- `src/app/dashboard/page.js`
- `tests/components/DashboardMotion.test.jsx`
- `progress.md`

### Decisions
- Active tabs use `md3-primary`/`md3-on-primary`; inactive tabs use `md3-on-surface-variant`.
- Flex expansion is used instead of a measured sliding indicator; inactive tabs use `gap-0` so icons stay centered.
- Motion remains enabled for all users at the approved tokenized duration.

### Verification
- Focused navigation suite: 5 passed.
- Full repository suite: 104 files passed, 1 skipped; 571 tests passed, 2 skipped.
- Production build passed with process-local placeholder values; no secrets written.
- Scoped `git diff --check` passed; existing CRLF warnings only.

### Blockers
- None for the navigation change.

---

## Session — 2026-08-29: Goal/Budget Pace and Recurring Expense Radar Hardening

### Tasks Completed
- Implemented Goal Pace, Budget Pace, and the Pro-only Recurring Expense Radar while preserving the existing Google Sheets and Supabase architecture.
- Fixed Budget Pace period aliases (`bulan`/`tahun`), all-period aggregation, account filtering, Jakarta date handling, and budget detail matching.
- Scoped shared settings, bills, budgets, and goals caches by normalized user account and added stale-request isolation coverage.
- Hardened Radar dismissal persistence with append-only Settings records, bounded v2 fingerprints, and compatibility for existing long v1 fingerprints.
- Added Radar feature-flag/entitlement wiring, bill prefills, UI coverage, API coverage, and regression tests.

### Files Changed
- `src/lib/wibCalendar.js`
- `src/lib/budgetPace.js`
- `src/lib/recurringExpenses.js`
- `src/lib/useSharedData.js`
- `src/app/api/settings/route.js`
- `src/app/dashboard/page.js`
- `src/app/dashboard/HomeTab.jsx`
- `src/components/BudgetsSection.jsx`
- `src/components/BudgetStatusCard.jsx`
- `src/components/BillsSection.jsx`
- `src/components/RecurringExpenseRadar.jsx`
- `src/lib/tier.js`, `src/lib/featureFlags.js`, `supabase/011-recurring-expense-radar.sql`
- Related files under `tests/api`, `tests/components`, and `tests/lib`
- `progress.md`

### Decisions
- Kept the implementation within existing Sheets/Supabase flows; no new service, dependency, automatic transaction, transfer, or payment behavior.
- Used append-only dismissal records to avoid cross-instance lost updates while retaining legacy read compatibility.
- Final review used the named `Code Reviewer`; no P0/P1/P2 blockers remained after bounded fixes.

### Verification
- Full Vitest suite: 108 files passed, 1 skipped; 608 tests passed, 2 skipped.
- `git diff --check`: exit 0; existing LF/CRLF conversion warnings only.

### Blockers
- `npm run build` is blocked by the production fail-fast check because these local environment variables are missing: `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`.

## Session — 2026-08-30: Tagihan Tab Auto-Refresh Bug Fix

### Tasks Completed
- Fixed the Rencana > Tagihan bug where scrolling or clicking anywhere re-fetched bills, cleared the list, showed the loading spinner, and closed open modals (Add/Pay/Delete), making the tab unscrollable and blocking bill creation.
- Root cause: `showToast` in `src/app/dashboard/page.js` was a plain per-render function passed down as `onToast`; `BillsSection.fetchBills` depended on it, so every dashboard re-render (scroll listener `setScrollY`, clicks, 30s sync timer) restarted the BillsSection fetch/reset effect.
- Fix 1 (root cause): memoized `showToast` with `useCallback(..., [])` in `page.js`, matching the existing `dismissToast` pattern; fixes the whole class of unstable-callback refetches across all sections.
- Fix 2 (hardening): `BillsSection` now keeps `onToast` in a ref and `fetchBills` depends only on `[sessionKey]`, so the fetch/reset effect can no longer restart from parent re-renders; error toasts use the latest `onToast` identity.
- Fix 3: pull-to-refresh gate switched from `contentRef.current.scrollTop <= 0` (always 0 — the content div is not an overflow container) to `window.scrollY <= 0`, so PTR only triggers at the actual top of the page.

### Files Changed
- `src/app/dashboard/page.js` — stable `showToast`, PTR gate on `window.scrollY`
- `src/components/BillsSection.jsx` — `onToastRef`, `fetchBills` deps `[sessionKey]`
- `tests/components/BillsSection.test.jsx` — 3 regression tests (no refetch/modal-close on unstable `onToast` re-renders, refetch on session change, error toast uses latest `onToast`)

### Decisions
- Fixed root cause plus defense-in-depth instead of only patching BillsSection; no behavior change when `onToast` is already stable.
- Session-scope reset semantics preserved: changing `sessionKey` still clears state and refetches.
- Did not touch `.env.local`; build verification used shell-only placeholder env values.

### Verification
- Focused: BillsSection (12), PlanTab (17), dataSectionsErrors (6), DashboardMotion (5) — all passed.
- Full Vitest suite: 108 files passed, 1 skipped; 611 tests passed, 2 skipped.
- `npm run build`: passed with placeholder values for the 4 locally missing env vars (previous session's build blocker resolved for verification only).
- `git diff --check`: clean.

### Blockers
- None.

## 2026-08-30 - Landing page revamp (fonts, scroll motion, FAQ, SEO, reorder)

### Tasks Completed
- P0 font bug fixed: `landing.css` referenced undefined `--font-landing-sans` / `--font-landing-mono`; body/eyebrows now use `--font-body` (DM Sans) and `h1`/`h2` use `--font-display` (Playfair Display), plus `tabular-nums` and `text-wrap: balance`.
- New shared motion system `src/components/landing/LandingMotion.jsx` (only new client component): data-attribute scroll reveals (`data-reveal`, `data-reveal-group`, `data-reveal-stagger`), count-ups (`data-count-to`), bar fills (`data-bar`), SVG line draws (`data-draw`), hero-float and CTA-evidence scroll parallax, scroll progress bar, and mobile sticky CTA (appears past 85vh, focus-managed, desktop-hidden). All reveals gated by `prefers-reduced-motion` via `gsap.matchMedia`.
- Removed both infinite CSS float loops (`landing-float-card`, `landing-cta-evidence-drift`); replaced with scroll-linked parallax. Locked by test assertions.
- New FAQ section (`src/components/landing/Faq.jsx`, server-rendered native `<details name="artami-faq">`) with 7 Indonesian Q/As in `FAQ_ITEMS`; added after Pricing; "FAQ" added to nav.
- SEO: `FAQPage` JSON-LD script and OpenGraph metadata (og:image temporarily `/icons/icon-512.png`; proper 1200x630 asset still TODO).
- Section order: DataOwnership moved before FutureForecast (privacy differentiator earlier).
- Pricing: QRIS verification microcopy under the Pro CTA.
- Wired data attributes across all 10 landing section components.

### Files Changed
- `src/app/landing.css` - font wiring, heading font, tabular-nums, float-loop removal, progress bar / mobile CTA / price-note / FAQ styles
- `src/app/(landing)/page.js` - LandingMotion mount, FAQ section, JSON-LD, OpenGraph, section reorder
- `src/components/landing/LandingMotion.jsx` (new), `src/components/landing/Faq.jsx` (new)
- All 10 landing section components - reveal/bar/count/draw attributes only, no copy changes
- `src/lib/landingContent.js` - `FAQ_ITEMS`, FAQ nav item
- `tests/landingPage.test.js` - LandingMotion client-boundary + Faq server-boundary, FAQ/JSON-LD assertions, float-loop removal assertions

### Decisions
- One client component owns all GSAP motion to respect the landing page's server/client boundary test invariant.
- GSAP-only (already installed); no new dependencies; IntersectionObserver fallback unnecessary.
- FeatureBento keeps its existing local panel animation; shared system handles the rest.
- CTA evidence parallax restricted to >=48rem (items become a static grid on mobile).
- No WhatsApp CS link yet (SITE_LINKS same-origin invariant; no CS number available).

### Verification
- Focused: `tests/landingPage.test.js` 7/7 passed.
- Full Vitest suite: 108 files passed, 1 skipped; 611 tests passed, 2 skipped.
- `npm run build`: compiled successfully (12/12 pages) with build-only placeholder values for the 4 locally missing env vars; nothing committed or deployed with placeholders.
- `git diff --check`: clean.
- Note: an aborted pre-plan attempt briefly overwrote `src/app/(landing)/page.js`; it was restored via `git checkout` before the planned rewrite was applied.

### Blockers
- None. (Proper og:image asset 1200x630 still TODO before launch.)

## 2026-08-30 — Profile tab Docs (Panduan) hub

### Tasks Completed
- Added an in-app Panduan docs hub on the Profile tab: grouped topic list opening in the existing Sheet component, with per-topic detail view and back navigation.
- New static content module src/lib/docsContent.js (4 groups, 15 topics, Bahasa Indonesia) covering Pengeluaran Rutin vs Spesial, Net Worth, Event Budget, Utang & Piutang, Saldo Awal, Health Score, Financial Independence, Forecast & Anomaly, What-If & Year-in-Review, Tagihan, Undo, Google Sheets data ownership, privacy, Free quotas, and Free vs Pro.
- Pro-only topics carry a Pro badge; content is pure JS so it can be shared with the future Expo app unchanged.
- New tests: tests/components/DocsSection.test.jsx (3) and tests/lib/docsContent.test.js (3).

### Files Changed
- src/lib/docsContent.js (new), src/components/DocsSection.jsx (new), src/app/dashboard/ProfileTab.jsx (+5 lines: import + Panduan SectionCard), tests/components/DocsSection.test.jsx (new), tests/lib/docsContent.test.js (new), progress.md

### Decisions
- Docs content lives client-side as a frozen static module (mirrors landingContent.js); no CMS, Supabase table, or API route.
- Contextual deep-links from LockedFeaturePreview and quota warnings deferred as a follow-up (Option C).

### Verification
- Focused: vitest run DocsSection + docsContent — 6/6 passed. Full suite: 617 passed, 2 skipped, 0 failed. Production build: compiled successfully (local build needs placeholder values for LEGACY_SHEET_OWNER_EMAIL and NEXT_PUBLIC_GOOGLE_* Picker vars — pre-existing environment condition, unrelated to this task). git diff --check clean.

### Blockers
- None.

## 2026-08-31 — Integrated landing page Editorial Orbit revamp

### Tasks Completed
- Rebuilt the integrated `/` landing page around a stable editorial hero scene with one coherent Artami product canvas, three restrained edge fragments, and scroll-synced copy-to-product progression.
- Replaced the previous floating-card composition with three value pillars, an interactive product workspace, a peach data-ownership chapter, a deep-moss Financial Intelligence chapter, and an interactive What-If impact lab.
- Removed the requested hero sentence, preserved signed-in redirect and same-origin CTA behavior, and retained accurate Google Sheets ownership, limited `drive.file` access, Rp40.000 lifetime pricing, and unavailable Play Store status.
- Added responsive and reduced-motion behavior; mobile hides decorative fragments, avoids horizontal page overflow, and keeps a static product canvas. Corrected the final-review finding that initially applied desktop reduced-motion offsets to mobile.

### Files Changed
- `src/app/(landing)/layout.js`, `src/app/(landing)/page.js`, `src/app/landing.css`
- `src/components/landing/EditorialHero.jsx`, `PlatformPillars.jsx`, `InsightPlanStage.jsx`, `DataOwnership.jsx`, `FinancialIntelligence.jsx`, `WhatIfScenario.jsx`, `LandingMotion.jsx`; removed the unused `HeroShader.jsx`
- `src/lib/landingContent.js`, `tests/landingPage.test.js`, `tests/components/LandingProductShowcase.test.jsx`

### Decisions
- Adapted Steep's structural principles without copying its assets, code, logos, or exact visuals: one persistent hero canvas, large editorial chapters, real product proof, and restrained motion.
- Product tabs change only through explicit user interaction; scroll motion reveals and composes the page but does not silently change product state.
- Kept the landing route server-rendered except for navigation, product interaction, What-If controls, auth-aware upgrade, and the shared GSAP motion boundary.

### Verification
- Focused landing checks: 13/13 passed.
- Desktop browser QA at 1280×720: initial hero, mid-scroll product resolution, product showcase, privacy chapter, and intelligence chapter verified; no browser errors.
- Mobile browser QA at 390×844: fragments hidden, coherent cropped product canvas, and document width equals viewport width.
- Independent final diff review: approved after the reduced-motion mobile correction.
- Full Vitest suite: 111 files passed, 1 skipped; 620 tests passed, 2 skipped.
- `git diff --check`: clean for the landing scope.

### Blockers
- `npm run build` is blocked before compilation by the existing local production environment check: `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are not configured in this environment.

## 2026-09-01 - Landing page Steep-reference redesign pass (in place)

**Tasks completed**
- Removed fake browser chrome (traffic-light dots + fake URL) from hero, product showcase, and What-If workspaces; replaced with a clean "Contoh tampilan" artboard label.
- Reduced hero canvas density to one primary financial number, one chart, one Health Score, one budget status, and a short transaction list; mobile hides the demo sidebar and uses a tighter 47rem internal crop (no page-level horizontal scroll).
- Added `TrustStrip` (server component) after the hero: Google Sheet ownership, no bank connection, one-time payment.
- Converted the data-ownership band from peach to pale sage (Artami's customer-story chapter equivalent) with moss-tinted hairlines and shadows.
- Converted the Pro price card from solid deep moss to pale sage with an ink action; Financial Intelligence stays the only dark chapter.
- Replaced the dark rounded final CTA with a spacious white chapter plus a restrained Sheet -> understanding -> decision line flow.
- Expanded the footer into a light-gray directory footer (Produk / Pelajari / Legal / Akses) with a large wordmark; no fabricated details.
- Typography: hero h1 clamp(4.5rem, 6vw, 5.75rem) lh 1.0; chapter h2 clamp(3rem, 4.2vw, 4rem); mobile 40px/1.25; tabular numerals on the landing root.
- Navigation 64px, lighter blur; pill buttons at 44px min-height with hover/active/focus-visible states.
- Product tab surfaces now crossfade (opacity + 16px translate) via a one-time CSS animation; removed 6 of 8 eyebrow labels (kept "Produk" and "Financial Intelligence").
- Sticky scene uses 100dvh; all existing motion/reduced-motion behavior preserved.

**Files changed**
- src/app/(landing)/page.js, src/app/landing.css
- src/components/landing/{EditorialHero,PlatformPillars,InsightPlanStage,DataOwnership,WhatIfScenario,Pricing,Faq,FinalCTA,Footer}.jsx
- src/components/landing/TrustStrip.jsx (new)
- tests/landingPage.test.js (4 new refinement tests)

**Decisions**
- Sage replaces peach as the ownership-band background; peach remains a small accent (pillar card 1, pro badge, intelligence core).
- Pillar mobile stays a single-column stack (allowed by brief); What-If mobile already places controls above the canvas.

**Verification**
- Focused landing tests: 14 passed.
- Full suite: 624 passed / 2 skipped (111 files passed / 1 skipped).
- Production build: compiled and generated successfully (4 required env vars absent locally; placeholders injected into the build process only - pre-existing environmental blocker, unchanged).
- git diff --check clean.

## 2026-09-02 — Landing interaction and motion enhancement

### Tasks Completed
- Added an Artami-colored WebGL hero shader with a CSS fallback, visibility pause, context recovery, and a static reduced-motion state.
- Reworked the desktop hero scroll sequence so the Sheet, Health Score, and anomaly cards resolve into matching dashboard destinations; mobile stays compact and non-sticky, while no-JavaScript and reduced-motion modes show the completed dashboard composition.
- Made the three platform pillars interactive with distinct peach, blue-lilac, and sage active states, expanding layouts, and replayable illustration motion across pointer, focus, and touch input.
- Turned Financial Intelligence into four explicit, keyboard-accessible panels for Health Score, Cash Flow Forecast, Anomaly Alerts, and Freedom Number, with persistent Google Sheet ownership context and clearly labeled illustrative values.

### Files Changed
- `src/components/landing/HeroShader.jsx`, `EditorialHero.jsx`, `LandingMotion.jsx`, `heroMorph.js`, `PlatformPillars.jsx`, `FinancialIntelligence.jsx`
- `src/app/landing.css`
- `tests/landingPage.test.js`, `tests/components/HeroShader.test.jsx`, `heroMorph.test.js`, `PlatformPillars.test.jsx`, `FinancialIntelligence.test.jsx`
- `docs/superpowers/plans/2026-09-01-artami-landing-interaction-enhancements.md`, `progress.md`

### Decisions
- Kept the shader decorative and non-interactive, using Artami peach, sage, mint, and deep-moss tones rather than copying reference-site assets.
- Limited morphing to desktop geometry and preserved explicit user control for intelligence panels; no API, payment, quota, Supabase, mobile-app, or dependency changes were introduced.
- Preserved signed-in redirect behavior, same-origin calls to action, Rp40.000 lifetime pricing, limited `drive.file` privacy language, and unavailable Play Store status.

### Verification
- Focused landing checks: 27/27 passed across 6 files.
- Independent final diff review: approved after shader cleanup, ARIA, clipping, mobile sizing, pointer-event, motion-duration, and no-JavaScript fallback corrections.
- Full Vitest suite: 115 files passed, 1 skipped; 637 tests passed, 2 skipped.
- Local Next.js development compilation returned HTTP 200 for `/`; generated markup contained the shader, pillar controls, intelligence tabs, ownership statement, stable tab panel, and Rp40.000 copy.
- `git diff --check`: clean for the landing scope (line-ending conversion warnings only).

### Blockers
- The one-time production build stopped at the existing fail-fast environment check because `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are unavailable locally.
- Automated in-app browser visual QA could not open the localhost URL under the active browser navigation policy; behavior is covered by component tests and local HTTP compilation, but final visual inspection remains a manual follow-up.

## 2026-09-02 — Landing shader and motion performance correction

### Tasks Completed
- Corrected the landing-page performance regression after live review: reduced shader render density and noise complexity, capped WebGL drawing at approximately 30 FPS, removed per-frame resize work, and paused rendering when the hero is offscreen.
- Increased the shader's time progression and visual opacity so the Artami peach, sage, mint, and moss movement is perceptible without changing the approved art direction.
- Reduced the desktop hero ScrollTrigger scrub delay from 0.9 to 0.2 seconds and removed scroll-linked border-radius painting.
- Replaced the pillar cards' 520ms flex animation with short transform/color transitions, avoiding repeated row layout while preserving active, hover, focus, and touch feedback.
- Removed the fixed navigation backdrop blur to reduce continuous compositing work during scroll.

### Files Changed
- `src/components/landing/HeroShader.jsx`, `src/components/landing/LandingMotion.jsx`
- `src/app/landing.css`
- `tests/components/HeroShader.test.jsx`, `tests/landingPage.test.js`
- `progress.md`

### Decisions
- Preserve the existing visual composition and feature behavior; optimize rendering rather than simplifying the landing-page content.
- Keep a static shader frame for reduced-motion users and the existing CSS gradient fallback when WebGL is unavailable.
- Keep the shader intentionally lower-resolution and CSS-upscaled because it is an atmospheric background, not a detail-critical product image.

### Verification
- Regression-first checks failed for the four intended missing behaviors before implementation.
- Focused landing suite: 6 files passed, 30 tests passed.
- User live review confirmed that shader movement is visible and the page is substantially less laggy.
- Independent final diff review: approved with no blocking findings.
- Full Vitest suite: 115 files passed, 1 skipped; 640 tests passed, 2 skipped.
- `git diff --check`: clean apart from Windows line-ending conversion warnings.

### Blockers
- The one-time production build stopped at the existing fail-fast environment check because `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are unavailable locally.

## 2026-09-03 — Landing trust-copy refinement

### Tasks Completed
- Removed the three-item trust strip directly below the hero.
- Renamed the product showcase headline to “Dari catatan menjadi keputusan.”
- Strengthened the privacy section with “Kami tidak menyimpan data transaksimu.” and an immediate Google Sheet ownership clarification.

### Files Changed
- `src/app/(landing)/page.js`
- `src/components/landing/InsightPlanStage.jsx`, `src/components/landing/DataOwnership.jsx`
- `src/lib/landingContent.js`, `tests/landingPage.test.js`
- Removed `src/components/landing/TrustStrip.jsx`; updated `progress.md`

### Decisions
- Kept “Datamu, tetap milikmu.” as supporting copy and preserved the existing limited-access explanation.
- Made no changes to animation, pricing, authentication, data access, calls to action, or application behavior.

### Verification
- Focused landing checks: 2 files passed, 15 tests passed.
- Independent final diff review: approved with no blocking findings.
- Full Vitest suite: 115 files passed, 1 skipped; 640 tests passed, 2 skipped.
- Local Next.js development server returned HTTP 200 on `http://localhost:3001`; the new headlines and clarification were present, and all three removed trust-strip claims were absent.

### Blockers
- The one-time production build stopped before compilation at the existing fail-fast environment check because `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are unavailable locally.

## 2026-09-03 — Financial Intelligence copy refinement

### Tasks Completed
- Updated the Financial Intelligence introduction and rail label with the approved positioning.
- Renamed the landing-page “Freedom Number” feature to “Financial Freedom” and added its early-retirement projection explanation.
- Updated the Cash Flow Forecast explanation and replaced the closing statement with the approved financial-awareness message.

### Files Changed
- `src/components/landing/FinancialIntelligence.jsx`
- `tests/components/FinancialIntelligence.test.jsx`
- `progress.md`

### Decisions
- Used the user-approved wording verbatim.
- Preserved the four-tab interaction, keyboard navigation, illustrative values, Google Sheet ownership path, and all non-copy behavior.

### Verification
- Focused landing checks: 2 files passed, 17 tests passed.
- Independent final diff review: approved with no runtime or code findings.
- Full Vitest suite: 115 files passed, 1 skipped; 641 tests passed, 2 skipped.
- Local Next.js development server returned HTTP 200 on `http://localhost:3001` with all approved copy present and the old “Freedom Number” label absent.

### Blockers
- The one-time production build stopped before compilation at the existing fail-fast environment check because `LEGACY_SHEET_OWNER_EMAIL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` are unavailable locally.

## 2026-09-05 — Hero assembly and section handoff

### Completed
- Implemented the approved assemble, settle, continue motion while retaining all three moving cards and the existing reduced-motion fallback.
- Added headline breathing time, proportional card scaling, a foreground assembly layer, and a scroll-linked chart draw after assembly.
- Tightened the desktop hero to 240vh (110rem minimum) and connected its native sticky release to the pillars heading with closer desktop spacing.
- Preserved mobile layout, copy, links, and financial/authentication behavior. Root owned implementation and integration; one independent reviewer approved the final diff.

### Files Changed
- src/components/landing/LandingMotion.jsx
- src/components/landing/heroMorph.js
- src/app/landing.css
- tests/components/heroMorph.test.js
- progress.md (this appended entry; earlier uncommitted content preserved)

### Verification
- Regression-first geometry checks: failed before uniform scaling, passed after implementation.
- Focused checks: 17 tests passed. Full suite: 115 files passed, 1 skipped; 642 tests passed, 2 skipped.
- Browser verified desktop assembly, foreground cards, delayed chart draw, next-heading handoff, reverse-scroll reset, and 390x844 mobile layout/desktop-transform cleanup.
- Independent final diff review approved without blockers; scoped git diff --check passed.

### Blockers / Separate Observations
- Production build stopped at the existing missing environment-variable check: LEGACY_SHEET_OWNER_EMAIL, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_PICKER_API_KEY, NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER.
- Existing dashboard height clips its bottom at a 720px desktop viewport; responsive dashboard sizing was not expanded into this motion task.

## 2026-09-05 — Admin-controlled Pro registration capacity

### Tasks Completed
- Added a global-only `Pendaftaran Pro` capacity valve that starts open and supports immediate or one-time scheduled Open/Close changes from the admin Feature Controls workspace.
- Kept the existing QRIS feature flag as the stronger emergency shutdown while allowing existing awaiting and pending payment flows to continue after registration closes.
- Added atomic, service-role-only payment-request creation so a committed closure blocks new and replacement requests without relying on Netlify instance caching.
- Added active-payment counts and closure confirmation for admins, plus the closed `/upgrade` state and `Pro sementara ditutup` labels across dashboard upgrade entry points.
- Documented the capacity flow in `docs/Flow-system.md` and added focused API, SQL-adapter, feature-flag, admin, payment, and dashboard regression coverage.

### Files Changed
- `supabase/012-pro-registration-capacity.sql`
- `src/lib/paymentRegistration.js`, `src/lib/featureFlags.js`, `src/lib/featureAccess.js`
- Payment and admin feature APIs, admin controls, upgrade flow, and affected dashboard/component prop paths
- Focused tests under `tests/api`, `tests/lib`, and `tests/components`
- `docs/Flow-system.md`, `progress.md`

### Decisions
- Registration is Open after the migration and remains under one global admin control with no per-user override.
- Closing blocks only new or replacement payment requests; it does not revoke Pro, cancel active payments, hide history, or stop admin review.
- Closed messaging has no waitlist or WhatsApp action, and automatic Netlify usage monitoring remains outside scope.

### Verification
- Regression-first checks failed on the intended missing behaviors before implementation and passed after implementation.
- Independent final diff review found one existing-Pro closed-state regression; the original implementation owner added a failing regression test, corrected it, and the reviewer confirmed the blocker resolved.
- Full Vitest suite: 117 files passed, 1 skipped; 660 tests passed, 2 skipped.
- Production build passed with temporary non-secret placeholders for four locally missing fail-fast variables; no environment file or deployment configuration was changed.
- Scoped `git diff --check` passed with Windows line-ending conversion warnings only.

### Blockers / External Verification
- Migration `012` has not been applied to the live Supabase project in this session, so live RPC permissions and real concurrent Close-versus-create behavior remain to be verified after migration.

## 2026-09-06 — Smart Anggaran historical copy

### Tasks Completed
- Added a Free/Paid-safe historical budget copy flow with a compact one-screen review sheet.
- Added source-month history selection, editable copied limits, manual selection, `Pilih semua`, duplicate preservation, inactive/invalid row states, and destination-period editing.
- Added a server-side batch endpoint that validates source row indexes, destination composite keys, positive limits, and the complete target-month quota while holding one creation lock.
- Preserved the existing single-budget CRUD flow and Google Sheets A–F schema; no recurring schedule, template tab, AI recommendation, or Supabase migration was added.

### Files Changed
- `src/lib/recordQuota.js`, `src/lib/budgetCopy.js`
- `src/app/api/budgets/copy/route.js`
- `src/components/BudgetCopyModal.jsx`, `src/components/BudgetsSection.jsx`, `src/app/dashboard/PlanTab.jsx`
- Focused tests under `tests/lib`, `tests/api`, and `tests/components`
- `docs/Flow-system.md`, `docs/superpowers/specs/2026-09-06-smart-budget-copy-design.md`, `docs/superpowers/plans/2026-09-06-smart-budget-copy.md`

### Decisions
- Use the compact single-screen layout selected during the visual companion review.
- Keep all rows unchecked initially; `Pilih semua` may select beyond Free capacity, but saving remains disabled until the selection fits.
- Never overwrite destination duplicates; copy category, account, and edited limit with a blank note.
- Treat stale source/destination state as a retryable conflict and preserve the review state.

### Verification
- Baseline full suite before implementation: 117 files passed, 1 skipped; 660 tests passed, 2 skipped.
- Focused implementation checks: 5 files passed, 32 tests passed after the final corrections across quota, API, and copy-sheet behavior.
- Independent final diff review cleared all three task-caused blockers (ambiguous browser response, Paid/Admin lock serialization, and accessible account-aware labels).
- Final full suite: 120 files passed, 1 skipped; 685 tests passed, 2 skipped.
- Production build passed with temporary non-secret process placeholders for four locally missing fail-fast variables; no environment file or deployment configuration changed.
- Final `git diff --check` passed with Windows line-ending conversion warnings only.

### Blockers
- No known task-caused blocker; live Google Sheets copy acceptance remains a deployment/manual verification step.

## 2026-09-06 — Rencana tab editorial planner revamp

### Tasks Completed
- Reworked the Rencana tab into a calm editorial planner with a motivating journey: persistent page heading, chapter rail, overview signals, section transitions, and responsive mobile stacking.
- Refined Anggaran with pace-aware progress bars and a time-based reference marker, Tagihan with a chronological agenda rail and urgency states, and Target with a continuous blue-to-teal-to-green gauge.
- Added precise Indonesian copy, editorial typography/shape tokens, accessible loading/error states, focus treatments, and reduced-motion handling without changing financial logic or existing handlers.

### Files Changed
- `src/app/dashboard/PlanTab.jsx`, `src/app/globals.css`
- `src/components/BudgetProgressBar.jsx`, `src/components/BudgetCard.jsx`, `src/components/BudgetsSection.jsx`
- `src/components/TargetGauge.jsx`, `src/components/GoalCard.jsx`, `src/components/GoalsSection.jsx`
- `src/components/BillsSection.jsx`, `src/components/FeatureEducation.jsx`
- `tests/components/BudgetProgressBar.test.jsx`, `tests/components/TargetGauge.test.jsx`
- `AGENTS.md`, `progress.md`

### Decisions
- Keep the headline simple: `Rencanakan keuanganmu.`
- Use `Sisa anggaran bulan ini` instead of ambiguous “ruang yang masih aman” language.
- Keep data, quota, entitlement, and persistence behavior unchanged; only presentation and local UI states were revised.

### Verification
- Focused plan suite: 8 files passed, 54 tests passed.
- Full Vitest suite: 122 files passed, 1 skipped; 689 tests passed, 2 skipped.
- Production build passed with temporary non-secret process placeholders for four locally missing fail-fast variables; no environment file or deployment configuration changed.
- Independent final diff review approved with no blocking findings.
- Final `git diff --check` passed with normal Windows line-ending conversion warnings only.

### Blockers
- No known task-caused blocker; authenticated browser acceptance remains a deployment/manual verification step.

## 2026-09-07 — Rencana navigation and monthly brief correction

### Tasks Completed
- Restored the Rencana chapter labels to the prior wrapped grid behavior, including seven columns at the previous desktop breakpoint and no horizontal scrolling.
- Replaced the separate Ringkasan signal cards with the approved single monthly brief panel containing Anggaran, Tagihan, and Target rows.
- Connected each row to its existing data source, protected dynamic values with accessible descriptions, and kept the budget summary independent from unrelated Stats filters.

### Files Changed
- `src/app/dashboard/PlanTab.jsx`, `src/app/globals.css`, `src/components/PlanBriefSignal.jsx`
- `tests/components/PlanTab.test.jsx`, `tests/components/PlanBriefSignal.test.jsx`, `tests/components/featureVisibility.test.jsx`

### Decisions
- Preserve the prior seven-label navigation hierarchy and responsive breakpoints.
- Keep the Ringkasan panel concise and data-led: Anggaran, Tagihan, then Target.
- Keep all financial writes, quotas, entitlement checks, and persistence behavior unchanged.

### Verification
- Focused suite: 2 files passed, 20 tests passed; feature visibility regression: 6 tests passed.
- Full Vitest suite: 123 files passed, 1 skipped; 692 tests passed, 2 skipped.
- Production build passed with temporary non-secret process placeholders for four locally missing fail-fast variables; no environment file or deployment configuration changed.
- Independent final diff review approved with no remaining task-caused blockers.
- Local commit requested; no remote push performed.

## 2026-09-08 — Landing closing CTA redesign

### Tasks Completed
- Replaced the centered closing CTA with a rounded sage panel, left-aligned editorial copy, and five static concentric arcs.
- Updated the closing invitation to `Lebih paham uangmu. Lebih jelas langkahmu.` with one clear `Mulai gratis` action.
- Removed the obsolete process pills and unavailable Play Store message from the closing section while preserving the conditional published Play Store action.
- Added focused regression coverage for the approved copy, link contract, conditional store branch, and decorative artwork accessibility.

### Files Changed
- `src/components/landing/FinalCTA.jsx`
- `src/app/landing.css`
- `tests/landingPage.test.js`
- `progress.md`

### Decisions
- Keep the CTA server-rendered and preserve its existing `/dashboard` destination.
- Use the existing Source Serif 4 and DM Sans pairing, Artami sage and forest tokens, and a static SVG without new dependencies or motion.
- Stack the artwork in a separate 112px strip below the CTA content on mobile so it never competes with the copy.

### Verification
- Regression-first landing check failed on the missing approved CTA before implementation and passed after the change.
- Focused landing suite: 1 file passed, 14 tests passed.
- Full repository suite: 123 files passed, 1 skipped; 693 tests passed, 2 skipped.
- Production build passed with temporary non-secret process placeholders for four locally missing fail-fast variables; no environment file or deployment configuration changed.
- Browser layout checks covered 360, 390, 768, 1024, and 1440 CSS pixels without horizontal overflow; keyboard Enter reached `/dashboard`.
- Contrast measured 9.85:1 for forest text on sage and 12.08:1 for white text on the primary button.
- Independent final diff review approved with no blocking findings.
- `git diff --check` passed with normal Windows line-ending conversion warnings only.

### Blockers
- None. Desktop and 390px mobile visual acceptance were captured locally alongside live responsive layout measurements and accessibility-tree inspection.

## 2026-09-13 — Paired event collaboration implementation plan

### Tasks Completed
- Consolidated the agreed two-person paired-event feature into a decision-complete implementation plan.
- Defined the event-only privacy boundary, dedicated Google Sheet architecture, open-code plus owner-approval flow, Pro entitlement, contributor role, actual-deposit accounting, personal mirrors, revocation, and retry/concurrency safeguards.

### Files Changed
- `docs/superpowers/plans/2026-09-13-paired-event-collaboration.md`
- `progress.md`

### Decisions
- Pairing applies to any generic Momental event, not only weddings.
- Exactly two Pro users participate: one owner and one contributor.
- A contribution is actual deposited money; expenses may use the shared fund or the acting partner's private account.
- Shared financial rows remain in a dedicated event Sheet; Supabase stores collaboration metadata only.
- The open code creates a pending request; the owner approves Drive access using the partner's authenticated identity.

### Verification
- Plan self-review completed: no placeholder markers, interface-name mismatches, or task-caused whitespace errors found.
- `git diff --check -- docs/superpowers/plans/2026-09-13-paired-event-collaboration.md` passed.

### Blockers
- Runtime implementation has not started. The plan requires a two-account Google Drive/Picker smoke test before any production batch.

## 2026-09-17 — Financial foundations implementation (checkpoint balances, allocation-owned goals, protected write pipeline)

### Tasks Completed
- Canonical money model in `src/lib/balances.js`: `Saldo Tercatat` (starting-balance month cutoff), `Kekayaan Bersih` (+Piutang −Utang), `Saldo uang saat ini` (checkpoint-adjusted), `Dana yang bisa dipakai` (minus liquid reservations), and shortfall; single `buildMovements` classification shared by display totals and balances.
- Additive idempotent Sheet schema (`src/lib/financialSchema.js`): `Pemasukan`→P:S, `Pengeluaran`→Q:T after `Sifat` at P, `Tabungan`→P:U, `Utang`→J:M, hidden `_ArtamiOperations` receipt tab; occupied target cells produce a read-only `SCHEMA_CONFLICT` instead of overwrites.
- One protected write pipeline (`src/lib/financialWrites.js`): client-generated `operationId`, `op:<uuid>` write claims, per-user `financial-write` lock, optional quota reservation, atomic `batchUpdate` mutation + receipt; replays return `already_committed` without consuming quota; failure resolution reads the receipt before releasing anything, and unreadable receipts fail closed as `OPERATION_UNRESOLVED`.
- All existing mutation routes adopted the pipeline: transaction create/edit/delete/Undo, bill pay, debt create/pay/delete. New endpoints: `POST /api/balance-checkpoint`, `GET /api/financial-operations/[operationId]`, `GET|POST /api/savings/allocations`, `POST /api/goals/spend`.
- Strict money validation (`parsePositiveAmount`) after finding `-1` became `+1` and text became `0` under the old regex; strict checkpoint parser after `parseRupiah("banyak")` returned 0.
- Client half: `src/lib/financialWriteClient.js` (operation-id retention, one automatic verification after transport failure, retry-only-when-definitely-absent) and `src/lib/financialWriteState.js` (offline/stale/schema-conflict/unresolved write blocking with `Periksa lagi`).
- Dashboard serves the canonical payload under `balances`; goal progress across GoalsSection, GoalPickerModal, PlanBriefSignal, WhatIfModal, and page.js now follows explicit `goalId` allocations via the allocation summary, with legacy category-matched progress retired.
- Minimum UI: Beranda hero keeps Kekayaan Bersih and adds `Dana yang bisa dipakai saat ini` with its basis label, plus a `Rincian saldo` breakdown (recorded balance, Utang/Piutang, target reservations, unassigned savings, investment, informational unpaid bills, needs-review estimate); Profile gains the permanent `Total saldo saat ini` editor (Rp0 saves as confirmed); current-month labels renamed to `Uang masuk` / `Uang keluar` / `Arus kas bersih`; category wording now `Bisa digunakan` / `Investasi (nilai nominal)`.

### Files Changed
- New: `src/lib/{balances,movement,financialSchema,financialOperations,financialWrites,financialWriteClient,financialWriteState,savingsAllocation,checkpoint,ledgerRows}.js`, `src/components/BalanceCheckpointCard.jsx`, `src/app/api/{balance-checkpoint,financial-operations/[operationId],savings/allocations,goals/spend}/route.js`
- Modified: `src/app/api/dashboard/route.js` (rewritten around buildMovements), `src/app/api/{transaction,transaction/[id],bills/pay,debts,settings}/route.js`, `src/lib/{sheets,validation,goalUtils,categories}.js`
- UI: `src/app/dashboard/page.js`, `HomeTab.jsx`, `ProfileTab.jsx`, `PlanTab.jsx`, `_components/{balanceCopy,EditTransactionModal}.jsx`, `src/components/{GoalsSection,GoalPickerModal,PlanBriefSignal,WhatIfModal,BillPayModal,DebtPaymentModal,DebtSetupModal,DebtsSection,GoalContributeModal,CategoryManager,HealthScoreCard}`
- Tests: 16 new files (schema, checkpoint, balances, allocations, writes, receipts, client, isolation, plus route suites for checkpoint/lookup/allocations/spend/dashboard balances); updated route and component suites to the new contracts.
- Docs: roadmap decision-record header, `docs/sheets-{debts,goals,settings}.md`, `docs/Flow-system.md` wording.

### Decisions
- `Saldo uang saat ini` derives from unfiltered rows: tier history filtering limits browsing, not ownership.
- Receipt reads fail closed: a missing `_ArtamiOperations` tab is a knowable absence, any other read error is unresolved.
- A checkpoint is never quota-consuming; assignment/release also write no ledger row; goal-funded spending consumes exactly one unit.
- Pro limits and Free caps unchanged; no Supabase migration was needed (existing creation lock + write claims carry the new keys).

### Verification
- Focused suites per batch; full local suite at completion: 136 test files passed, 1 skipped; 881 tests passed, 2 skipped (plus one production build and `git diff --check` after the final review, which found no blocking findings).

### Blockers
- Assignment/release/spend screens ship API-only by approved scope; the review screen is the next UI milestone.
- Legacy savings with blank goal metadata read as reserved/unassigned until the review screen exists.

## 2026-09-18 — Home simplification + savings review screen

**Task:** Simplify Beranda's balance terminology after user feedback that the six terms (Saldo Tercatat, Total saldo saat ini, Kekayaan Bersih, Tabungan belum dibagi ke target, Tagihan belum dibayar, Dana yang bisa dipakai saat ini) read as synonyms, and ship the missing savings review UI so "Bisa dipakai sekarang" becomes actionable.

**Decisions (confirmed with user):**
- Direction: slim down + rename, not hide. Hero keeps Kekayaan Bersih + the spendable number; Rincian saldo answers "why is spendable smaller than net worth" without repeating hero values.
- Merged ledger balance + saved checkpoint into one row, **Uang kamu** (user picked the name).
- "Dana yang bisa dipakai saat ini" renamed **Bisa dipakai sekarang**; "Tabungan belum dibagi ke target" → **Tabungan tanpa target**.
- The Rp1.89jt-vs-Rp18.8jt confusion traced to legacy Tabungan rows counting as reserved-but-unassigned (per approved policy). User chose UI + review screen; hero now shows the held amount and links to review.
- Naming rule: one concept = one label = one place; hero numbers are never repeated inside Rincian saldo.

**Files:** `src/app/dashboard/_components/balanceCopy.js` (renames, `buildRincianRows` slimmed 11→7 rows, merged saldo row), `src/app/dashboard/HomeTab.jsx` (hero "Disisihkan di tabungan" pill → opens review, rincian slimmed), `src/components/SavingsReviewModal.jsx` (new — lists unassigned Tabungan rows, assign/release via `/api/savings/allocations` with fingerprints + one operationId, stale reload, unresolved "Periksa lagi"), `src/components/GoalsSection.jsx` (review entrypoint in Tersedia-untuk-dibagi card, `onBalancesChanged` refresh), `src/app/dashboard/PlanTab.jsx` + `src/app/dashboard/page.js` (`onDataChanged={fetchData}` plumbing). Tests updated/added: HomeTab, GoalsSection, SavingsReviewModal (7 new tests).

**Verification:** focused suites green (HomeTab 17, SavingsReviewModal 7, GoalsSection 6, PlanTab 17); full suite + build + `git diff --check` at final gate. No schema, quota, or pipeline changes; `/api/savings/allocations` already had the write-pipeline contract.

## 2026-09-19 — Wave 1: honest sync status + universal write gating

**Task:** First post-foundation wave from `docs/2026-09-09-product-improvement-roadmap.md` (plan persisted at `docs/superpowers/plans/2026-09-19-wave1-sync-and-write-gating.md`): the app must never look synced after a failed refresh, and every money-writing surface must refuse writes when the app cannot trust what it shows.

**Batches:**
- A — Sync truth + return refresh: `SyncStatus.jsx` now derives state from the shared `financialWriteState` store (overridable prop for tests) and shows approved copy: failed refresh → "Pembaruan data gagal — Menampilkan data terakhir yang berhasil disinkronkan [time]" with Coba lagi (aria-label swap), offline → "Anda sedang offline — Menampilkan data terakhir yang tersimpan di perangkat ini", schema conflict → its block message with warning icon; failure label clears only on `markSynced`. Added `shouldAutoRefreshOnVisible` (5-min threshold, pure + exported from `useDashboardCache.js`) and a `visibilitychange` effect in `page.js` that auto-refreshes on return, with `checkingRefresh` rendering "Memeriksa pembaruan…" while figures stay on screen.
- B — Universal write gate: `useFinancialWriteGuard()` wired into QuickAddSheet, EditTransactionModal, BillPayModal, DebtPaymentModal (both buttons), DebtSetupModal, GoalContributeModal, GoalPickerModal (rows disabled); disabled submit + reason alert (`role="alert"`) in each; `performDelete` and `restoreTransaction` (Undo) in `page.js` refuse with an error toast when blocked. Healthy states unchanged; quota checks remain downstream of the gate.
- C — Logout privacy: `clearCache(owner)` added to `useDashboardCache.js`; new `handleSignOut` in `page.js` clears the owner-scoped cache + `resetWriteState()` before `signOut`; used by connector, error screen, ProfileTab prop (covers Keluar + account deletion). Preferences untouched.

**Tests:** `SyncStatus.test.jsx` rewritten regression-first (failure never shows "Tersinkron", offline distinct, store-driven derivation, checking-label); new `WriteGate.test.jsx` (10 tests, pre-render store mutation pattern — this env's RTL `act` is not callable) and `logoutCache.test.js`; `useDashboardCache.test.js` extended (threshold boundaries, clearCache scoping).

**Decisions:** failed refresh treats unresolved-operation as failure, not sync; offline and stale stay visually separate; threshold helper counts a missing/invalid lastSyncAt as stale so an account that never synced retries on return; writeState prop kept on SyncStatus for deterministic tests.

**Verification:** focused suites green per batch; final gate: full suite 919 passed / 2 skipped (140 files), production build passed, `git diff --check` clean. One task-caused regression (GoalPickerModal JSX structure during a formatting pass) was caught by the suite and repaired. Pre-existing unrelated worktree changes from other sessions were left untouched.

**Blockers:** none for this wave. Next per audit order: Wave 2 (Google Sheets Anda ownership hub), then Wave 3 (recurring-to-bill forecast fingerprint).

## 2026-09-19 — Wave 2: Google Sheets ownership and recovery hub

**Task:** Second post-foundation wave from `docs/2026-09-09-product-improvement-roadmap.md` (plan persisted at `docs/superpowers/plans/2026-09-19-wave2-sheets-ownership-hub.md`): make the user's Sheet ownership visible and recoverable, and close the login-freshness gap in the write gate.

**Batches:**
- A — Connection metadata: migration `011-spreadsheet-metadata.sql` (nullable `spreadsheet_name`/`spreadsheet_url`); `createUserSheet` now returns `{ spreadsheetId, name, url }` from the Google create response; provisioning in `apiAuth.js` persists both with the same `.is("spreadsheet_id", null)` tenant guard (non-fatal on failure); `connect-legacy-sheet` backfills name/url via Drive `files.get` and refreshes them on same-file reconnection (metadata failure stays non-fatal); new tenant-scoped `GET /api/sheets/connection` returns `{ connected, needsLegacyReconnect, name, url }` with lazy backfill and a constant-format `docs.google.com/spreadsheets/d/<own-id>/edit` fallback.
- B — Login freshness gate: `WRITE_BLOCK.pending` in `financialWriteState` ("Memuat data terbaru…"), set in page.js when a session key appears with cached data; cleared by `markSynced`, replaced by `markStale`; never downgrades schema-conflict or unresolved blocks. SyncStatus renders pending as the checking label; every write gate blocks while pending.
- C — Hub UI + recovery copy: new `SheetsHubCard.jsx` in Profile (file name, Wave 1 connection states, last sync, Buka di Google Sheets, Coba lagi, three ownership paragraphs: ledger lives in your Drive, backup/export explanation, clearing cache ≠ deleting account ≠ deleting Sheet); specific recovery copy for schema conflict, expired Google session, and legacy reconnect; dashboard route classifies Google 401/UNAUTHENTICATED errors into `GOOGLE_AUTH_REQUIRED`; `LegacySheetConnector` copy rewritten (why the picker appears, how to identify the file, what cannot change after selection) — copy-only.

**Tests:** new `sheetsConnection.test.js` (5), `dashboardGoogleAuth.test.js` (2), `financialWriteState.test.js` (7), `SheetsHubCard.test.jsx` (8); updated `legacySheetReconnect.test.js` (new response contract + metadata refresh), `ProfileTab.test.jsx` (connection fetch-aware), `SyncStatus.test.jsx` and `WriteGate.test.jsx` (pending cases).

**Decisions:** metadata persistence and Drive reads are always non-fatal (connection stays functional without them); lazy backfill only targets the user's own row scoped by both `id` and `spreadsheet_id`; the fresh-empty account path is unaffected by the pending gate; URL never user-editable and only from Google-provided values or the constant format.

**Verification:** focused suites green per batch; final gate: full suite 943 passed / 2 skipped (144 files), production build passed, `git diff --check` clean. One node segfault during a combined focused run was environmental and cleared on rerun. Pre-existing unrelated worktree changes remain untouched.

**Blockers:** migration `011` needs to be applied to the live Supabase project (code degrades gracefully until then). Next per audit order: Wave 3 (recurring-to-bill forecast fingerprint).

## 2026-09-21 — Wave 3: Recurring-expense and bill reconciliation

**Task:** Third post-foundation wave from `docs/2026-09-09-product-improvement-roadmap.md` (plan persisted at `docs/superpowers/plans/2026-09-19-wave3-recurring-bill-reconciliation.md`): a converted recurring expense now contributes exactly one future obligation to the forecast, its history stops feeding the variable baseline, and ambiguous bill matches are never silently resolved. No Supabase migration needed (Sheet-side + libs only).

**Batches:**
- A — Tagihan `Sumber` column (N): provisioning schema extended 13→14 columns; new `ensureBillSourceHeader` in `sheets.js` (modeled on `ensureExpenseClassHeader`, conflicting header fails closed as schema conflict); `rowToBill` reads N as `sourceFingerprint`; bills GET ensures the header, POST/PUT persist a validated fingerprint (`recurring:` prefix + length cap, same rules as dismissals) in the same appended/updated row — one write, no half-state. Pay route reads the unbounded `Tagihan` range so legacy 13-col sheets and the new 14-col grid both work.
- B — Forecast reconciliation: `computeForecast` excludes historical routine expenses whose recomputed fingerprint matches an aktif bill's stored `Sumber` (in addition to the `billpay:` exclusion), then adds each scheduled bill once via `scheduledBillTotals`; deleting/disabling a bill restores history into the baseline. `findRecurringExpenses` returns `needsReview: true` for partial matches (name matches, category/account differ) instead of silently dropping them; full matches suppress by stored fingerprint so suppression survives renames.
- C — UI + copy: `RecurringExpenseRadar` shows a "Perlu ditinjau" state with the Tambah action disabled; `BillsSection`/`BillSetupModal` pass the fingerprint on convert and show "Terjadwal dari pengeluaran rutin" on sourced bills; `CashFlowForecast` explanation states already-scheduled routine spending is counted once — no `recurring:v1:…` identifiers in product copy. Bill payments stay replay-safe via the existing operation ID (verified, unchanged).

**Tests:** new `billSourceFingerprint.test.js` (10: grid expansion, header conflict, same-row persistence, legacy reads, repeat-conversion idempotence), `billPaySourceColumn.test.js` (6: N written on pay row, reservation intact), `forecastReconciliation.test.js` (8: match/ambiguous/dismissed/converted/delete/disable/baseline-restore); extended `recurringExpenses.test.js` (needsReview cases) and `RecurringExpenseRadar.test.jsx` (review state); updated mocks in `billPayIdempotency.test.js`, `nextRowSelection.test.js`, `financialWriteIsolation.test.js` for the unbounded Tagihan read and new sheets export.

**Decisions:** fingerprint validation reuses the dismissal rules (prefix + length, no round-trip semantics); conversion re-checks the receipt so a repeat convert returns 409 instead of double-scheduling; a bill's `Sumber` is never exposed for user editing; empty/unknown column values are treated as no source (full backward compatibility).

**Verification:** focused suites green per batch (6 failures during development were test-side: URL-encoded `!` in matchers, missing mock exports, and two contradictory fixtures — all repaired); independent diff review clean; final gate: full suite **963 passed / 2 skipped** (147 files), production build passed (11 env placeholders), `git diff --check` clean. Pre-existing unrelated worktree changes untouched. Nothing committed.

**Blockers:** none. Next per audit order: remaining Wave 4+ items from the roadmap.
