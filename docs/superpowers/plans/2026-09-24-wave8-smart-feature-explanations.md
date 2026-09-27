# Wave 8 — Smart-feature explanations and Pro previews

Date: 2026-09-24 · Source: `docs/2026-09-09-product-improvement-roadmap.md` → Wave 8 (line 1005) · Risk: Medium

## Task contract

**Outcome:** Unlocked users can explain which records and assumptions produced every smart-feature result; locked users only ever see compact, static, non-personal previews with a single upgrade action per screen context; entitlement resolution never flashes a false "tidak tersedia" state.

**Included:** gate-state helper; LockedFeaturePreview unresolved/example states; live coverage facts in all unlocked smart features; evidence navigation where wiring exists; plain coverage-language confidence.

**Exclusions:** no entitlement/quota/API/Supabase behavior changes; no changes to `isFeatureEnabled`/`hasFeature`/`isProRegistrationOpen` semantics (additive helper only); no model/probability language; no Wave 9 payment UI; no React Native work; Recurring Expense Radar stays preview-only (no unlocked component exists).

**Protected invariants:** featureAccess semantics and admin-unavailable fail-closed behavior; Phase 3 locked-preview policy (static, non-personal, in-section); Free workflows unobstructed; locked call sites pass zero user data.

## Implementation record

1. **Gate helper — `src/lib/featureAccess.js`:** additive `getFeatureGate(entitlement, key)` → `enabled | locked | unavailable | unresolved`. `null` entitlement = `unresolved` (neutral placeholder); `entitlementVerified: false` = `unresolved` (fail-closed); admin flag off = `unavailable`; tier denial = `locked`. Existing booleans untouched.
2. **LockedFeaturePreview:** new `unresolved` state (`role="status"`, "Memuat ringkasan…", no CTA, no unavailable/Pro copy) and optional static `example` line. Exactly one upgrade action enforced by tests.
3. **All 7 locked call sites** migrated to the three-state gate (HomeTab Health Score; StatsTab anomaly/forecast/YIR; PlanTab FI/What-If; BillsSection radar) — fixing the pre-existing defect where Pro users saw a false "Fitur sedang tidak tersedia" flash while `/api/me` resolved. Each preview gained a static non-personal example line.
4. **page.js:** planned fail-closed sentinel proved unnecessary — preview gating lives entirely in the tabs, which now handle `unresolved` themselves. No page.js gating change made (only the forecast evidence wiring below).
5. **Live coverage facts:**
   - Forecast info sheet: months used, data gaps, scheduled income/expense amounts, income-profile explanation in plain language (stable → weighted average; irregular/limited → median), plus "Lihat tagihan terjadwal" evidence link (`onOpenBills` → page.js `openPlanSection("bill")` → StatsTab → Rencana bills section).
   - Health Score formula sheet: months covered (max of routine/actual series), liquid-savings category basis, excluded components with reasons (no budget / <2 months / no income), plus "Lihat anggaran" evidence link (`onOpenPlanBudgets` → HomeTab's existing `openPlanSection("budget")`).
   - Anomaly footnote: names the actual three baseline months (chronological) + "Pengeluaran Spesial tidak diikutkan".
   - FI calculation sheet: "Data terpakai: N bulan selesai — <named months>" via exported `getCompletedExpenseMonths` (lib unchanged).
   - What-If: first-ever basis note — category average uses ALL recorded expenses including Spesial, over N recorded months.
   - Year-in-Review: "Rutin dan Spesial masuk hitungan" secondary line when ready (min-10 gating untouched).
6. **Confidence language:** all new copy is plain coverage language; an explicit test asserts no `%`/probability/keyakinan wording in the forecast sheet. No calibrated model exists, so none is claimed.

## Verification (focused checks per roadmap)

- Free/locked, Paid, Admin, registration-closed, flag-off: `featureAccess.test.js`, `LockedFeaturePreview.test.jsx`, `featureVisibility.test.jsx`, `HomeTab.test.jsx` (unresolved vs locked), `BillsSection.test.jsx`, `PlanTab.test.jsx`.
- Insufficient data: forecast <3 months (existing), FI <2 months (existing), YIR <10 tx (`SmartFeatureBasisNotes.test.jsx`), Health empty state (existing behavior, unchanged).
- Excluded data: Health null components with reasons; forecast special-exclusion note (existing, kept); anomaly Spesial skip now disclosed; WhatIf Spesial inclusion now disclosed.
- Evidence navigation: forecast → bills, Health → budgets (positive + hidden-without-handler tests).
- Absence of personal values in locked markup: `previewPropsContract.test.jsx` (no user name/email/Rp figures in preview).
- Full suite: 1128 passed / 2 skipped (168 files). Production build passed (with placeholder env vars, matching Waves 1–7). `git diff --check` clean.

## Decisions

- `getFeatureGate` returns `unresolved` for `null`/unverified entitlement instead of reusing `unavailable`: the roadmap's "replace the preview in place after entitlement resolves" requires a distinguishable in-flight state; showing "tidak tersedia" for a not-yet-answered request is a false claim.
- Evidence navigation shipped only where a navigation primitive already existed (`openPlanSection`); FI→recap and YIR self-evidence were dropped as low-value vs. added prop plumbing.
- WhatIf's Spesial-inclusive basis is disclosed rather than changed: WhatIf is a manual what-if tool, and changing its input basis would alter results users may already rely on (out of scope).
