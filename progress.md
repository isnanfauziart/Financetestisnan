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
