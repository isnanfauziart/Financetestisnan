# Artami Finance Dashboard - System Flow

**Status:** Current for Phases 0-1. Phase 2+ sections are planned until their routes/components exist.

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

- The upgrade CTA opens a dedicated `/upgrade` page; QRIS is not shown inline below the CTA.
- Opening `/upgrade` does not create a request. Tapping `Mulai Pembayaran` creates an `awaiting_payment` request, starts an exact 48-hour deadline, and then displays the Rp40.000 static merchant QRIS with `Simpan QR`. The fixed, non-editable amount has a `Salin Nominal` action.
- The payment page shows a live countdown and the exact WIB deadline. Before proof upload, the user may cancel the request; it becomes `cancelled`, remains in history, and permits an immediate new request.
- At 48 hours, show `Waktu pembayaran berakhir`, disable new payment through that request, and offer `Buat Pembayaran Baru`. During the one-hour grace period, starting a new request requires confirmation and permanently abandons the old request's late-proof eligibility.
- After the grace hour, the request becomes `expired` and remains in history. Show `Hubungi CS` first and `Buat Pembayaran Baru` second, with a warning not to pay twice.
- Users upload a JPEG, PNG, or WebP image proof after paying, with a maximum size of 5 MB. They must provide the payment date and approximate time in WIB; the payer/account name is optional. Proofs live in the private `payment-proofs` bucket. Valid proof changes the request to `pending` and remains valid until admin review.
- Payment must be exactly Rp40.000. Underpayment is rejected as `Nominal tidak sesuai`; do not combine a second payment to cover it. Overpayment is rejected as `Lainnya`, requires an admin note describing the amount or issue, and shows `Jika salah pembayaran, silahkan hubungi CS`.
- Each user may have only one active request (`awaiting_payment` or `pending`). Cancellation, expiry, rejection, or revocation allows a new request, while approval ends the upgrade flow.
- Admins compare the proof, submitted payment date/time, late-upload marker, and optional payer/account name with their merchant payment notification, then approve or reject it in `/admin`. Rejection requires `Bukti tidak jelas`, `Nominal tidak sesuai` for underpayment, `Pembayaran belum ditemukan`, `Bukti duplikat`, or `Lainnya`, with an optional note except that overpayment requires a note.
- Only `isnanfauzi08@gmail.com`, seeded in the `admins` table, may access Phase 2 admin payment actions.
- Approval grants `paid`; rejection keeps the user free, shows the reason and optional note, and offers a WhatsApp CS action for `+62 882-0062-82613`.
- The admin may revoke an approved payment only after confirmation. The admin must choose `Dana dikembalikan`, `Pembayaran duplikat`, `Pembayaran terdeteksi palsu`, `Koreksi administratif`, or `Lainnya`, with an optional note. Revocation changes the payment to `revoked`, returns the user to `free`, preserves the audit record, shows the reason and optional note to the user, and allows a new submission like a rejection.
- The pending screen always shows optional WhatsApp CS with: `Pembayaran biasanya diproses dalam 1–30 menit. Jika belum terverifikasi setelah 30 menit, silakan hubungi CS melalui WhatsApp.`
- Refunds and payment-amount corrections are handled entirely through WhatsApp; the admin records the result in the payment note. Phase 2 has no in-app refund workflow.
- WhatsApp opens with an editable prefilled message containing the issue type and a short reference such as `PAY-A1B2C3D4`, derived from the payment UUID. Never include the full UUID, private proof URL, or sensitive payment details.
- Show `Hubungi CS` for `pending`, `rejected`, `revoked`, `expired`, and incorrect-payment states only. Select the issue type automatically from context while keeping the WhatsApp message editable.
- Do not allow proof replacement after status becomes `pending`. Show the latest payment first and all prior statuses, short references, dates, and admin reasons under expandable `Riwayat Pembayaran`.
- Owners may reopen only their own proof through a short-lived signed URL; never expose the Storage path.
- Show in-app banners for `approved`, `rejected`, and `revoked`. Do not automatically send WhatsApp, email, or push notifications in Phase 2.
- Owner and admin proof links expire after 5 minutes and are regenerated on every `Lihat Bukti` action.
- Keep result banners visible until dismissed. Store dismissal locally per device; history remains available and the banner stays dismissed on later logins on that device.
- Sort pending admin work oldest first, visibly mark late uploads, poll every 30 seconds while `/admin` is open, and provide `Segarkan`.
- Require approval/rejection confirmation showing the short reference, amount, and action.
- Allow an admin to correct `rejected` to `approved` only after explicit confirmation and a mandatory reason: `Kesalahan verifikasi admin`, `Bukti pembayaran ditemukan`, `Konfirmasi melalui CS`, or `Lainnya`; `Lainnya` requires a note.
- Preserve the original rejection details, record the correcting admin and timestamp, and block correction while a newer `awaiting_payment` or `pending` request exists.
- Show `Pembayaran Anda telah disetujui setelah peninjauan ulang. Akses Pro sekarang aktif.` A corrected approval may later use the normal protected revocation flow.
- Keep searchable admin history for `approved`, `rejected`, `revoked`, `expired`, and `cancelled`, using short reference or user email.
- Bundle QRIS locally at `public/payment/qris-gopay.jpeg`, show merchant name `FAWAID DIGITAL STORE, DIGITAL & KREATIF`, and replace it only through a reviewed deployment plus real scanner verification.
- Checkout order: fixed amount/`Salin Nominal`, merchant, QRIS/`Simpan QR`, deadline, short reference, instructions, proof form, cancellation.
- Support camera, gallery, and file proof selection with preview, filename, and size. Allow local replacement before submission only.
- Failed uploads remain retryable through grace, clean up partial Storage objects, and never create duplicate payment/proof records.
- Grace-period replacement requires the approved abandonment warning and changes the old request to `expired` before creating another.
- Admin rejection, revocation, and correction use validated visible forms, not browser prompts. A blocked correction shows the newer active request and never silently cancels it.
- Keep payment metadata/audit while the account exists. Delete proof images five years after terminal status while retaining metadata.
- Account deletion revokes Pro but retains email and payment history, removes other account/profile connections, and discloses retention before confirmation.
- A returning user with the same email may receive manual Pro restoration without repayment after admin review and a documented valid reason.
- Show result banners on `/dashboard` and `/upgrade`; payment history is newest-first, 20 initially, with `Muat Lebih Banyak`.
- Admin history uses status filters, PAY/email search, and 50-record pages with `Sebelumnya`/`Berikutnya`; no Phase 2 export.
- Automatic WhatsApp contexts: `Pembayaran belum diverifikasi`, `Pembayaran ditolak`, `Akses Pro dicabut`, `Pembayaran kedaluwarsa`, `Kesalahan nominal`, and `Pengembalian dana`.

- `/api/payments`
- `/api/admin/payments`
- `/admin`
- `src/lib/adminAuth.js`
- `src/lib/tier.js`
- `src/lib/usage.js`
- Supabase Storage bucket `payment-proofs`

## Planned Phase 3: Feature Gating

Not current until implemented:

- `/api/me`
- `/api/me/upgrade`
- `src/lib/featureGate.js`
- Server-side free-tier limits on transactions, budgets, goals, debts, events, bills, and insights

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
