# Artami Finance Dashboard

Personal finance dashboard for Indonesian users. The app is built with Next.js 14, NextAuth Google OAuth, Tailwind CSS, Recharts, Google Sheets for user-owned finance data, and Supabase for account metadata.

## Current Status

Phases 0-3 (security fixes, Supabase + per-user Google Sheets, payments + admin, feature gating) are complete and verified in production. Phase 4 (polish + hardening) is current.

The phase tracker in [`docs/commercialization-plan.md`](docs/commercialization-plan.md#phase-tracker) is authoritative — check there rather than here.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
LEGACY_SHEET_OWNER_EMAIL=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Generate `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Data Model

Financial data lives in each user's Google Sheet. Supabase stores only user metadata, tier/payment records, usage counters, feature flags, and admin emails.

Per-user Google Sheets tabs:

| Tab | Purpose | Columns |
|---|---|---|
| `Pemasukan` | Income transactions | A-O |
| `Pengeluaran` | Expense transactions | A-O |
| `Tabungan` | Savings transactions | A-O |
| `Budgets` | Monthly category budgets | A-F |
| `Goals` | Savings goals | A-I |
| `Utang` | Debts and receivables | A-I |
| `Momental` | Event budget planning | A-K |
| `EventBudgets` | Event sub-budgets | A-F |
| `Tagihan` | Bill reminders | A-M |
| `Settings` | User settings | A-B |

## Useful Docs

- `AGENTS.md` - current project rules and phase tracker
- `docs/commercialization-plan.md` - business model and phase status
- `docs/Flow-system.md` - current and planned system flow
- `docs/sheets-*.md` - Google Sheets tab schemas
- `supabase/README.md` - Supabase setup

## Commands

```bash
npm run dev
npm run build
npm run test
npm run start
```

There are currently no standalone lint or typecheck scripts.
