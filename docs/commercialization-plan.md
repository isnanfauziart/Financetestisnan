# Artami Finance Dashboard - Commercialization Plan

**Status:** Active
**Current phase:** Phase 4 - Polish + Hardening
**Implementation status (1 August 2026):** Phase 3 Feature Gating is complete. Phase 4 hardening is implemented locally and verified with 305 passing tests plus a production build; the feature-flag migration is applied and read-only verified, while authenticated admin/override smoke tests and the release checklist remain before Phase 4 closure.

## Business Model

Artami uses a one-time lifetime payment for the Indonesian market.

| Tier | Price | Limits |
|---|---:|---|
| Free | Rp 0 | 75 transactions/month, 4 months history, 3 budgets, 1 goal, 3 insights/week |
| Pro | Rp 40,000 once | Unlimited usage plus smart features |

QRIS-only is the MVP payment model. Tapping `Mulai Pembayaran` creates a 48-hour request; opening `/upgrade` alone does not. Users pay Rp40.000, upload proof to a private Supabase Storage bucket, and wait for manual admin approval or rejection. Admins view proofs through short-lived signed URLs. An approved payment changes the user's Supabase tier to `paid`; rejected payments route to WhatsApp CS at `+62 882-0062-82613`.

### Payment Flow Decision

1. A free user opens the dedicated upgrade flow. Merely opening `/upgrade` does not create a payment request or start a timer.
2. The user taps `Mulai Pembayaran`; the server creates an `awaiting_payment` request that expires exactly 48 hours later. The page shows a live countdown plus the exact deadline in WIB.
3. The amount is fixed and not editable. The page displays Rp40.000 with a `Salin Nominal` button.
4. Before uploading proof, the user may cancel the request. It becomes `cancelled`, remains in payment history, and the user may immediately create another request.
5. At the 48-hour deadline, the screen changes to `Waktu pembayaran berakhir`, disables new payment through that request, and offers `Buat Pembayaran Baru`. During the additional one-hour grace period, starting a new request requires confirmation and permanently abandons the old request's late-proof eligibility.
6. During that grace hour, the submitted `payment_at` must fall between request creation and the original 48-hour deadline. The grace period permits late proof upload, not late payment.
7. After the grace hour, the request becomes `expired` and remains in history. The screen shows `Hubungi CS` as the primary action and `Buat Pembayaran Baru` as the secondary action, with a warning not to pay twice if the first payment succeeded.
8. The user pays exactly Rp40.000 via QRIS and submits a JPEG, PNG, or WebP payment proof with a maximum size of 5 MB. Underpayment is rejected as `Nominal tidak sesuai`; users cannot combine a second payment to cover the difference and must contact CS. Overpayment is rejected as `Lainnya`, requires an admin note describing the detected amount or issue, and shows `Jika salah pembayaran, silahkan hubungi CS`.
9. The server stores the proof in the private `payment-proofs` bucket and changes the request to `pending`. Proof uploaded before the deadline, or during the grace hour for an on-time payment, remains valid until admin review.
10. A user can have only one active request (`awaiting_payment` or `pending`); duplicate requests and submissions are blocked until the active request is cancelled, expired, or reviewed.
11. An admin reviews the payment in `/admin`; the proof is exposed only through a short-lived signed URL and displayed alongside the submitted payment date/time and optional payer/account name.
12. The admin approves or rejects the payment. Rejection requires one preset reason—`Bukti tidak jelas`, `Nominal tidak sesuai` for underpayment, `Pembayaran belum ditemukan`, `Bukti duplikat`, or `Lainnya`—plus an optional note, except that overpayment requires a note.
13. Approval changes the user's tier to `paid`; rejection leaves the tier unchanged, shows the reason and optional note to the user, and allows a new submission.
14. An approved payment can be changed to `revoked` only after admin confirmation. The admin must choose `Dana dikembalikan`, `Pembayaran duplikat`, `Pembayaran terdeteksi palsu`, `Koreksi administratif`, or `Lainnya`, with an optional note. Revocation preserves the audit record, returns the user to `free`, shows the reason and optional note to the user, and allows a new submission like a rejection.
15. The pending screen always offers WhatsApp CS and says: `Pembayaran biasanya diproses dalam 1–30 menit. Jika belum terverifikasi setelah 30 menit, silakan hubungi CS melalui WhatsApp.`
16. Refunds and payment-amount corrections are handled entirely through WhatsApp for Phase 2; the admin records the outcome in the payment note. Artami has no in-app refund workflow.
17. WhatsApp support links use an editable prefilled message containing the issue type and a short reference derived from the payment UUID, for example `PAY-A1B2C3D4`. The full UUID, proof URL, and sensitive payment details are never included in the message.
18. `Hubungi CS` appears for `pending`, `rejected`, `revoked`, `expired`, and incorrect-payment states, but not on the initial offer or normal QRIS checkout. The issue type is selected automatically from the current state; the message remains editable.
19. Once proof changes a request to `pending`, the user cannot edit or replace it. The latest payment is shown prominently, with an expandable `Riwayat Pembayaran` containing all statuses, short references, dates, and admin reasons.
20. A user may reopen only their own submitted proof through a short-lived signed URL. Never return the private Storage path.
21. Phase 2 shows in-app banners for `approved`, `rejected`, and `revoked`; it does not automatically send WhatsApp, email, or push notifications.
22. Owner and admin proof-viewing signed URLs last 5 minutes and are regenerated whenever `Lihat Bukti` is opened.
23. Payment-result banners remain until dismissed. Dismissal is stored locally per device; dismissed results remain in `Riwayat Pembayaran` and do not repeatedly appear on login on that device.
24. `/admin` orders pending payments oldest first, marks late proof uploads, polls every 30 seconds while open, and includes `Segarkan`.
25. Approval and rejection require confirmation showing the short payment reference, amount, and action.
26. An admin may change `rejected` to `approved` only after explicit confirmation and a mandatory correction reason. Allowed reasons are `Kesalahan verifikasi admin`, `Bukti pembayaran ditemukan`, `Konfirmasi melalui CS`, or `Lainnya`; the note is optional except for `Lainnya`.
27. Preserve the original rejection reason and note. Record who corrected it and when, and block correction while a newer `awaiting_payment` or `pending` request exists.
28. After correction, show: `Pembayaran Anda telah disetujui setelah peninjauan ulang. Akses Pro sekarang aktif.` A corrected approval may later follow the normal protected revocation flow.
29. `/admin` retains searchable history for `approved`, `rejected`, `revoked`, `expired`, and `cancelled`, searchable by short payment reference or user email.
30. Bundle the supplied QRIS at `public/payment/qris-gopay.jpeg` and show merchant name `FAWAID DIGITAL STORE, DIGITAL & KREATIF`. Do not load it from an external host.
31. Replace QRIS only through a reviewed asset replacement and deployment, followed by a real scanner check. Do not build QRIS management in `/admin`.
32. Checkout order is: fixed amount and `Salin Nominal`, merchant name, QRIS and `Simpan QR`, deadline, short reference, instructions, proof form, then cancellation.
33. Proof selection supports camera, gallery, and files where available. Show preview, filename, and size; replacement is allowed only before submission.
34. Failed uploads leave the request active and retryable through the grace period. Remove partial objects and prevent duplicate payment/proof creation.
35. Abandoning an old request during grace requires the approved warning and marks it `expired` before creating the replacement request.
36. Admin rejection, revocation, and correction use visible forms with preset reasons, conditional notes, payment summaries, validation, and disabled confirmation until valid; do not use browser prompts.
37. A blocked rejected-to-approved correction shows the newer active request reference and never silently cancels that request.
38. Keep payment metadata and audit history while the account exists. Keep proof images for five years after terminal status, then delete only the image.
39. Account deletion revokes Pro but retains the email and payment history. Remove other account/profile connections and clearly disclose the retained data before deletion.
40. If the same email returns, the admin may manually restore Pro without a new payment for a valid documented reason after reviewing retained history.
41. Show payment banners at the top of `/dashboard` and `/upgrade`. Show 20 newest-first history records initially with `Muat Lebih Banyak`.
42. Admin history uses status filters, PAY/email search, and 50-record pages with `Sebelumnya` and `Berikutnya`; no export in Phase 2.
43. WhatsApp issue labels are `Pembayaran belum diverifikasi`, `Pembayaran ditolak`, `Akses Pro dicabut`, `Pembayaran kedaluwarsa`, `Kesalahan nominal`, and `Pengembalian dana`.

The sole Phase 2 admin account is `isnanfauzi08@gmail.com`.
## Positioning

- Indonesian-first categories and language.
- User finance data stays in the user's own Google Sheet.
- No bank linking, no ads, no subscription.
- Smart features are paid hooks: Health Score, Cash Flow Forecast, Anomaly Alerts, What-If Simulator, and full historical access.

## Architecture

| Data | Storage |
|---|---|
| Transactions, budgets, goals, bills, debts, events, settings | Per-user Google Sheets |
| Users, tiers, payments, usage, feature flags, admins | Supabase |
| Auth | NextAuth Google OAuth |
| Hosting | Vercel |

## Phase Tracker

| Phase | Status | Notes |
|---|---|---|
| 0. Security Fixes | Complete | Token no longer exposed to session, tab whitelist, transaction validation, generic errors, security headers |
| 1. Supabase + Multi-Tenancy | Complete | Per-user sheets, Supabase users, auth context, sheet manager, migration helper |
| 2. Payments + Admin | Complete | Payment proof upload, `/admin`, approval/rejection, private storage, verified Pro activation |
| 3. Feature Gating | Complete | Tier limits, `/api/me`, quotas, locked previews, live Supabase RPC/REST auth, production revocation smoke, full tests, and production build verified |
| 4. Polish + Hardening | Current / locally implemented | Rate limiting, shared validation, health check, env validation, private global/per-user feature flags, schedules, segment filters, UI/API enforcement |
| 5. Testing + Verification | Planned | API tests, data isolation tests, security headers, manual checklist |

### Phase 3 Confirmed Policy

- Record caps count current Google Sheet rows; deletion releases a slot. Budgets allow three rows per month.
- The 75-transaction quota counts successful creations in the current WIB calendar month, regardless of entered transaction date. Deletion does not refund quota; Undo does not count twice.
- Goal contributions, bill payments, and debt payments consume transaction quota.
- Free users retain readable/editable over-limit data after Pro revocation, but cannot create more until below the cap.
- Free history is the current WIB calendar month plus the previous three; older data remains untouched and manageable in Google Sheets. Recap and Profile explain where older data remains.
- Free users receive up to three stable insight cards per week.
- Health Score, Cash Flow Forecast, Anomaly Alerts, Financial Independence, What-If, and Year-in-Review remain discoverable to Free users through non-personal static blurred previews; their real components and calculations run only for effective Pro users.
- Monthly PDF reports remain available to Free with a watermark; Pro removes it.
- Income, expense, and savings share one transaction allowance. Existing records remain editable at the limit.
- Limit warnings appear at 80% and 100%; rejected forms retain entered values and link to `/upgrade`.
- `/api/me` is the canonical client entitlement/usage endpoint; Phase 3 does not add `/api/me/upgrade`.
- Global feature flags remain Phase 4. Phase 3 uses canonical usage names: `transactions`, `budgets`, `goals`, `debts`, `momental`, `bills`, and `insights`.
- If tier or quota cannot be verified, new Free creations fail closed with a retryable error; safe reads and edits remain available.
- Profile shows complete quota usage; Pro limits serialize as `null`; feature screens show usage only near/at a limit.
- Phase 3 adds no analytics vendor, per-user overrides, grace periods, mobile-only endpoints, custom billing cycles, carry-over allowance, or quota purchases.
- Phase 4 decision: feature flags use global defaults plus admin-managed per-user overrides. Unlisted users inherit the global setting; all user-facing product features may be controlled, while authentication, authorization, privacy, and data-integrity protections remain non-toggleable infrastructure.
- Phase 4 operational decisions: optional or risky features fail closed when their flag cannot be read; successful updates invalidate the short cache; controls live in `/admin`; disabled features are hidden with a simple unavailable message for stale or direct access.
- Phase 4 hardening decisions: resolve feature flags server-side and expose only the current user’s effective access; rate-limit NextAuth separately by IP; keep security headers in `next.config.js`; and use minimal safe request-aware logging without sensitive values.
- Phase 4 environment/admin decisions: Vercel Production and Preview show all 11 required environment-variable names; `SPREADSHEET_ID` is an extra legacy variable and is not required by the per-user runtime. Admin controls use clear OFF confirmation, record `updated_at` and `updated_by`, find users by email/name search, and keep flag reads server-side. `/api/health` remains a fast liveness/configuration check without Google or Supabase network calls.
- Phase 4 Nice to Know decisions: defer full audit history, Redis/distributed rate limiting, branded maintenance pages, and code/data removal; future-dated global/targeted toggles and admin user-segment filters are included in the first implementation in a deliberately small form.
- Error and `/api/me` contracts remain client-neutral for the planned Expo app; all limit UI meets keyboard and non-color accessibility basics.
- Existing Free users start with a fresh transaction allowance when gating activates.
- Transaction quota uses an atomic Supabase reservation with release on Google Sheets write failure.
- The approved Phase 3 policy is summarized above and implemented in the source tree.

### Phase 4 Local Implementation

The local Phase 4 implementation includes:

- a shared 60/minute API limiter, separate NextAuth IP limiting, stricter payment/APK and account-deletion limits, shared validation, safe request-aware logging, and request IDs;
- production required-environment validation and a network-free `/api/health` check;
- server-only global feature flags with private per-user overrides, `Use global` reset, one-time future schedules, short caching, and immediate invalidation;
- an `/admin` Feature Controls switchboard for all user-facing features, protected system controls, OFF confirmations, and email/name, tier, and account-age filters; and
- UI/API enforcement with a safe `FEATURE_DISABLED` response while preserving existing ledger data.

The migration `009-phase4-feature-flag-foundation.sql` and live manual checks still need to be applied/completed before Phase 4 is marked complete.

## Launch Requirements

- Indonesian privacy policy.
- Indonesian terms of service.
- PSE registration.
- Trademark check/registration for Artami.
- Play Store assets when Android packaging is ready.

## Decisions

| Decision | Choice |
|---|---|
| Market | Indonesia only |
| Pricing | Rp 40,000 one-time lifetime |
| Payment MVP | QRIS-only manual verification; `Mulai Pembayaran` starts a 48-hour request, cancellation/expiry preserve history, timely proof remains pending until review, private proof storage, admin approval/rejection, and WhatsApp CS |
| Phase 2 admin seed | `isnanfauzi08@gmail.com`; every normalized email added to `admins` receives permanent effective Pro access |
| Finance data | User-owned Google Sheets |
| Metadata | Supabase |
| Mobile path | Web/TWA first, React Native/Expo later |
