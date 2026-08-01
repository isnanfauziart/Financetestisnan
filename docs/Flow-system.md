# Artami Finance Dashboard - System Flow

**Status:** Phases 0-4 are shipped and verified in production. Phase 5 Testing + Verification is current.

## Current Flow

1. User signs in with Google OAuth.
2. Server reads the Google access token from the NextAuth JWT, not from the client session.
3. `getAuthContext(request)` gets or creates the Supabase user.
4. If the user has no `spreadsheet_id`, the app creates a personal Google Sheet with all app tabs.
5. API routes read/write that user's sheet by `spreadsheetId`.
6. Dashboard data is parsed from Google Sheets and rendered in the web app.

## Current Data Storage

| Data | Storage |
|---|---|
| Transactions | Google Sheets tabs `Pemasukan`, `Pengeluaran`, `Tabungan` |
| Budgets | Google Sheets tab `Budgets` |
| Goals | Google Sheets tab `Goals` |
| Debts | Google Sheets tab `Utang` |
| Events | Google Sheets tabs `Momental`, `EventBudgets` |
| Bills | Google Sheets tab `Tagihan` |
| Settings | Google Sheets tab `Settings` |
| Users, tiers, payments, usage, feature flags, admins | Supabase |

Supabase does not store the user's finance ledger.

## Current API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Google OAuth |
| `/api/account/connect-legacy-sheet` | POST | Owner connects an existing sheet |
| `/api/dashboard` | GET | Dashboard aggregation |
| `/api/transaction` | POST | Create transaction |
| `/api/transaction/[id]` | PUT, DELETE | Update/delete transaction |
| `/api/budgets` | GET, POST, PUT, DELETE | Budget CRUD |
| `/api/goals` | GET, POST, PUT, DELETE | Goal CRUD |
| `/api/debts` | GET, POST, PUT, DELETE | Debt CRUD and payment action |
| `/api/momental` | GET, POST, PUT, DELETE | Event CRUD |
| `/api/momental/[id]` | GET, PUT, DELETE | Single event |
| `/api/momental/summary` | GET | Event summary |
| `/api/bills` | GET, POST | Bill list/create |
| `/api/bills/[id]` | PUT, DELETE | Bill update/delete |
| `/api/bills/pay` | POST | Pay bill and create transaction |
| `/api/bills/summary` | GET | Bill reminder summary |
| `/api/settings` | GET, PUT | User settings |
| `/api/migrate` | POST | Migration helper |
| `/api/download-apk` | GET | APK download |

## Google Sheets Schema

| Tab | Columns | Schema doc |
|---|---|---|
| `Pemasukan` | A-O | `AGENTS.md` |
| `Pengeluaran` | A-O | `AGENTS.md` |
| `Tabungan` | A-O | `AGENTS.md` |
| `Budgets` | A-F | `docs/sheets-budgets.md` |
| `Goals` | A-I | `docs/sheets-goals.md` |
| `Utang` | A-I | `docs/sheets-debts.md` |
| `Momental` | A-K | `docs/sheets-momental.md` |
| `EventBudgets` | A-F | `docs/sheets-momental.md` |
| `Tagihan` | A-M | `docs/sheets-tagihan.md` |
| `Settings` | A-B | `docs/sheets-settings.md` |

## Phase 2: Payments + Admin

Implemented and verified in production on 25 July 2026, including QRIS proof upload, admin approval, and Pro activation.

**Payment policy lives in [`commercialization-plan.md`](commercialization-plan.md#payment-flow-decision) — the 43 numbered rules there are authoritative.** This section documents only the routes, storage, and files that implement it.

Implementation surface:

| Route / file | Purpose |
|---|---|
| `/api/payments` | Create request, upload proof, list own history |
| `/api/payments/[id]` | Cancel own request, fetch own status |
| `/api/payments/[id]/proof` | Short-lived signed URL for own proof |
| `/api/admin/payments` | Pending queue, searchable history |
| `/api/admin/payments/[id]` | Approve, reject, revoke, correct |
| `/api/admin/payments/[id]/proof` | Short-lived signed URL for admin review |
| `/api/admin/users/restore-pro` | Manual Pro restoration for a returning email |
| `/upgrade` | QRIS checkout and payment history |
| `/admin` | Admin payments console |
| `src/lib/payments.js`, `src/lib/paymentAuth.js` | Payment helpers and owner authorization |
| `src/lib/adminAuth.js` | Admin allowlist check against the `admins` table |
| `src/components/PaymentQrisFlow.jsx` | Checkout, proof upload, history UI |
| `src/app/dashboard/_components/PaymentStatusBanner.jsx` | Approved/rejected/revoked banners |
| Supabase Storage `payment-proofs` | Private bucket; never expose the storage path |
| `supabase/007-payments-phase2.sql` | Tables, audit fields, active-request constraint, atomic review function |

## Phase 3: Feature Gating

Completed and verified on 30 July 2026. Supabase migration
`008-phase3-feature-gating.sql` was applied; live RPC/REST auth tests passed;
production Free → Pro → Free revocation smoke passed; admin permanent Pro was
already verified; `/api/me` and related routes are healthy; the full suite
passed with 272 passed and 2 skipped; production build passed.

Implemented through Phase 3E:

- `src/lib/tier.js` — canonical limits, warnings, smart-feature policy, and Free history window
- `src/lib/usage.js` — WIB periods/reset dates and atomic usage RPC wrappers
- `src/lib/entitlement.js` — stored-tier plus normalized admin effective entitlement
- `/api/me` — canonical entitlement plus Supabase transaction usage and batched Google Sheet record counts
- `src/lib/transactionQuota.js`, `src/lib/transactionUndo.js`, `src/lib/writeClaims.js` — atomic quota, replay-safe Undo, and automated-write idempotency
- `src/lib/recordQuota.js` — serialized Sheet-backed caps for budgets, goals, debts, Momental, and bills
- Profile and creation surfaces — complete quota display, 80%/100% warnings, retained form state, and accessible `/upgrade` actions
- `supabase/008-phase3-feature-gating.sql` — atomic usage, write claims, temporary creation locks, admin normalization, and service-role RPC hardening

Confirmed rules:

- Current Sheet rows determine record caps; deleting a row releases its slot.
- Transactions use an atomic monthly WIB creation counter shared by manual and automated ledger writes.
- Undo does not count the same transaction twice.
- Free history is the current WIB calendar month plus the previous three and is filtered without modifying older Google Sheet rows.
- Recap and Profile tell Free users that older data remains in Google Sheets.
- Free smart-feature UI shows non-personal static blurred previews for Health Score, Cash Flow Forecast, Anomaly Alerts, Financial Independence, What-If, and Year-in-Review; real components and calculations run only for effective Pro.
- Free monthly PDFs carry a watermark; Pro PDFs do not.
- `/api/me` supplies canonical tier, usage, limits, reset dates, effective feature access, current-user feature availability, and `/upgrade`; no `/api/me/upgrade` route is added in Phase 3.
- The UI warns at 80% and 100%, preserves rejected form values, and links to `/upgrade`.
- Pro revocation preserves readable/editable data and blocks only over-limit creation.
- Feature flags remain Phase 4; Phase 3 uses canonical plural usage names.
- Unverifiable tier/quota state fails closed for new Free creations while safe reads/edits remain available.
- Profile owns the full quota display; Pro limits serialize as `null`.
- Every normalized email in Supabase `admins` has permanent effective Pro access across auth, payment, quota, and UI paths.
- Contracts remain Expo-compatible without adding mobile-only endpoints.
- No analytics vendor, custom overrides, grace periods, or speculative quota/billing systems are added.

The approved Phase 3 policy is summarized in this section and in the commercialization plan.

## Phase 4 Feature-Access Flow Update

- The server resolves global feature defaults and the current user’s override before returning access and availability.
- `/api/me` or the existing authenticated response path returns only the current user’s effective feature access and availability.
- Clients never receive the full feature-flag table or another user’s override assignments.
- Admins confirm the scope before turning a feature OFF; existing data is preserved and the setting can be reversed.
- Admins find targeted users through email/name, tier, and account-age filters; global and override changes record `updated_at` and `updated_by`.
- Admins can schedule one-time future-dated ON/OFF transitions for global or targeted settings; recurring schedules remain deferred.
- Disabled features are hidden or return `403 FEATURE_DISABLED` with `Fitur sedang tidak tersedia.` for stale/direct access.
- API middleware applies normal, NextAuth, payment/APK, and destructive-action rate limits; security headers remain in `next.config.js`.
- `/api/health` reports local liveness/configuration only and does not call Google or Supabase.

Phase 4 code passed 305 tests and a production build. Migration `supabase/009-phase4-feature-flag-foundation.sql` and its public access boundary were verified, followed by live admin/global/override/schedule, disabled-feature, data-preservation, and non-admin smoke checks. The Play Store Phase 4 blocker is cleared; Phase 5 Testing + Verification is now current.

## Environment

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
LEGACY_SHEET_OWNER_EMAIL=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SPREADSHEET_ID` is no longer part of the normal runtime contract. Personal sheets come from `users.spreadsheet_id`.
