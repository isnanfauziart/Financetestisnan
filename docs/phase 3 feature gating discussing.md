# Phase 3 Feature Gating Discussion

Status: all product decisions are approved. Phase 3 is complete and live
verified as of 30 July 2026: Supabase migration `008-phase3-feature-gating.sql`
was applied; live RPC/REST auth tests passed; production Free → Pro → Free
revocation smoke passed; admin permanent Pro was already verified; `/api/me`
and related routes are healthy; the full suite passed with 272 passed and 2
skipped; production build passed.

This file is the settled Phase 3 decision record.

## Confirmed decisions

### C1. Free vs Pro feature table

Approved, with the missing visible features added.

| Feature | Free | Pro | Current owning surface |
|---|---:|---:|---|
| Transactions | 75 successful creations/month | Unlimited | `src/app/api/transaction/route.js`, `src/app/dashboard/WalletTab.jsx`, `QuickAddSheet.jsx` |
| Transaction history visible in Artami | Latest 4 calendar months | Unlimited | `src/app/api/dashboard/route.js`, `src/app/dashboard/page.js` |
| Recap transactions | Latest 4 visible months only | Unlimited history | `src/app/dashboard/_components/RecapSection.jsx` |
| Core summary cards | Latest 4 visible months only | Unlimited history | `src/app/dashboard/HomeTab.jsx` |
| Core category charts | Latest 4 visible months only | Unlimited history | `src/app/dashboard/StatsTab.jsx` |
| Core monthly trend chart | Latest 4 visible months only | Unlimited history | `src/app/dashboard/StatsTab.jsx` |
| Daily expense heatmap | Latest 4 visible months only | Unlimited history | `src/app/dashboard/StatsTab.jsx` |
| Month comparison | Allowed only across visible 4-month window | Unlimited comparison | `src/app/dashboard/StatsTab.jsx` |
| Drill-down modals | Latest 4 visible months only | Unlimited history | `src/app/dashboard/page.js` `DrillDownModal` |
| Filters/search | Latest 4 visible months only | Unlimited history | `src/app/dashboard/page.js`, `StatsTab.jsx`, `RecapSection.jsx` |
| Budgets | 3 per month | Unlimited | `src/app/api/budgets/route.js`, `src/components/BudgetsSection.jsx` |
| Goals | 1 current record | Unlimited | `src/app/api/goals/route.js`, `src/components/GoalsSection.jsx` |
| Debts/piutang | 3 current records | Unlimited | `src/app/api/debts/route.js`, `src/components/DebtsSection.jsx` |
| Momental events | 1 current event | Unlimited | `src/app/api/momental/route.js`, `src/components/EventBudgetsSection.jsx` |
| Bills | 3 current records | Unlimited | `src/app/api/bills/**`, `src/components/BillsSection.jsx` |
| Insights | 3 cards/week | Unlimited | `src/app/dashboard/page.js`, `src/app/dashboard/StatsTab.jsx` |
| Financial Health Score | Locked static preview | Visible | `src/components/HealthScoreCard.jsx` |
| Cash Flow Forecast | Locked static preview | Visible | `src/components/CashFlowForecast.jsx` |
| Anomaly Alerts | Locked static preview | Visible | `src/components/AnomalyAlerts.jsx` |
| Financial Independence tracker | Locked static preview | Visible | `src/components/FITrackerCard.jsx` |
| What-If Scenario | Locked static preview | Visible | `src/components/WhatIfModal.jsx`, `src/app/dashboard/PlanTab.jsx` |
| Savings Rate Trend | Latest 4 visible months only | Unlimited history | `src/components/SavingsRateTrend.jsx` |
| Monthly PDF report | Watermarked | No watermark | `src/components/MonthlyReportButton.jsx`, `src/lib/reportPdf.js` |
| Year-in-Review report | Locked static preview | Visible | `src/components/YearInReviewButton.jsx`, `src/lib/report.js` |

Confirmed rule: Free users see non-personal static locked previews for Pro
features, but real charts, values, calculations, and controls do not render or
run. Normal historical analysis—including recap, category charts, actual
monthly trends, Savings Rate Trend, heatmap, and month comparison—stays
available inside the four-month window.

### C2. Budget limit

Approved: 3 budgets per month, not 3 total across all months.

### C3. Records that consume slots

Approved: every row that still exists counts. Completed goals, settled debts,
inactive bills, and completed events still consume a Free slot until deleted.

### C4. Automatically created transaction rows

Approved: every created ledger row counts toward the transaction quota,
including goal contributions, bill payments, and debt payments.

### C5. Undo behavior

Approved: Undo does not consume quota again. Deletion did not refund the
original quota unit, so restore must not double-charge.

### C6. Pro revoked while over Free limits

Approved: keep existing data readable/editable and block only new creations
until the user is below the Free limit.

### C7. Four-month history limit

Approved: Free users only receive and see the latest 4 calendar months in
Artami. Older rows remain untouched in the user's Google Sheet.

Approved editor scope: old records are editable directly in Google Sheets only.
Do not build a special old-record editor in Phase 3.

Approved follow-ups: the window is the current WIB calendar month plus the
previous three, including empty months. Recap and Profile explain that older
data remains in the user's Google Sheet.

### C8. Insight limit

Approved: show up to 3 stable insight cards per week. Do not meter dashboard
views and do not add a Generate Insight button.

### C9. Smart-feature visibility

Approved: use server-provided tier for smart-feature access. Free users receive
static locked previews; real components, controls, data, and calculations are
effective-Pro only.

### C10. Existing users at Phase 3 launch

Approved: start every Free user's monthly transaction counter at 0 when Phase 3
is activated. Current-record caps still apply immediately from Sheet rows.

### C11. Usage write strategy

Approved: reserve one quota unit atomically in Supabase, write to Google
Sheets, then release the reservation if the Sheet write fails.

## Approved Medium decisions

### M1. Quota timezone and reset boundary

Recommended: use `Asia/Jakarta` (WIB). Monthly quota resets at 00:00 WIB on the
first day of the month. Weekly insight selection resets Monday at 00:00 WIB.

### M2. Editing while at the limit

Recommended: editing an existing record is always allowed because it does not
create another slot.

### M3. Transaction types share one allowance

Recommended: income, expense, and savings share one combined 75-transaction
monthly allowance.

### M4. `/api/me` response

Recommended: return canonical tier, usage, limits, reset dates, allowed/locked
features, and one upgrade URL. Skip `/api/me/upgrade` for Phase 3.

### M5. API rejection contract

Recommended: quota failures return HTTP `403` with:

```json
{
  "error": "Batas transaksi bulanan tercapai.",
  "code": "FEATURE_LIMIT_REACHED",
  "feature": "transactions",
  "upgrade": true,
  "current": 75,
  "limit": 75,
  "resetAt": "..."
}
```

`resetAt` is omitted for current-record limits.

### M6. Limit-reached UI

Recommended: preserve entered form values, show the Indonesian API error, and
provide one `Upgrade ke Pro` action to `/upgrade`.

### M7. Pro entitlement freshness

Recommended: protected APIs trust fresh tier from `getAuthContext()`. Dashboard
uses `/api/me` instead of stale session tier.

### M8. Near-limit warnings

Recommended: show compact usage copy at 80% and 100%, for example
`60 dari 75 transaksi bulan ini`. No notification/email/WhatsApp warnings.

### M9. Report gating detail

Recommended:

- Monthly PDF: Free can download with watermark, Pro without watermark.
- Year-in-Review: Pro-only, because it depends on full-year history and would
  conflict with the Free 4-month history limit.

### M10. Feature flags

Recommended: keep global feature-flag hardening in Phase 4. Do not mix rollout
flags into tier enforcement in Phase 3.

### M11. Canonical usage names

Recommended: use plural names consistently:
`transactions`, `budgets`, `goals`, `debts`, `momental`, `bills`, `insights`.

### M12. Server errors and degraded dependencies

Recommended: if tier/quota cannot be verified, reject new Free-tier creations
with a retryable generic error. Reads and edits remain available where safe.

### M13. Verification scope for Phase 3 completion

Recommended minimum:

- focused unit tests for tier periods and gate decisions;
- API tests for transaction quota, one record-based quota, Undo, and automated
  bill/debt/goal transaction paths;
- concurrency test for transaction 75/76;
- Free and Pro UI checks for smart-feature invisibility and upgrade errors;
- production build;
- manual Free -> limit -> upgrade -> immediate unlock -> revoke flow;
- no Phase 3 completion marker until all checks pass.

## Approved Nice-to-know decisions

### N1. Where usage is displayed

Recommended: show full quota usage in Profile under `Paket & Akses`. Feature
screens show usage only when near or at their limits.

### N2. Unlimited representation

Recommended: `/api/me` returns `limit: null` for Pro rather than JavaScript
`Infinity`, which is not valid JSON.

### N3. Upgrade copy

Recommended: reuse existing `/upgrade` product and price copy. Do not duplicate
a second pricing catalog in Phase 3.

### N4. Limit analytics

Recommended: use server logs only during Phase 3. Do not add an analytics
vendor or new tracking table.

### N5. Admin quota overrides

Recommended: no per-user custom limits. Admin controls entitlement through
existing free/paid tier and payment correction flows.

### N6. Grace periods

Recommended: no quota grace period. The current successful item is allowed; the
next creation is blocked.

### N7. Accessibility

Recommended: locked/hidden behavior must not strand keyboard users. Quota
errors use existing accessible form feedback and upgrade actions remain
keyboard reachable.

### N8. Documentation synchronization

Recommended: after decisions are approved, synchronize `AGENTS.md`,
`docs/commercialization-plan.md`,
`docs/Flow-system.md`, and `progress.md`. Do not mark Phase 3 complete until implementation and end-to-end verification finish.

### N9. Mobile compatibility

Recommended: keep error codes and `/api/me` JSON client-neutral for the planned
Expo app. Do not add mobile-only endpoints during this web phase.

### N10. Deferred complexity

Recommended: no custom billing cycle, quota purchase, carry-over allowance,
family/shared quota, admin quota dashboard, or per-feature pricing.
