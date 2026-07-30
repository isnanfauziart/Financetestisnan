# Artami Finance Dashboard - Supabase Setup

## Overview

This folder contains the database schema and setup scripts for Artami Finance Dashboard's multi-tenancy system. Supabase stores user accounts, tier/payment records, usage counters, feature flags, and admin emails. Financial ledger data stays in per-user Google Sheets.

## Implementation Status

- Database schema exists for users, payments, usage, feature flags, and admins.
- Phase 1 multi-tenancy is complete in the app.
- Phase 2 payment/admin routes, private storage, and admin UI are complete.
- Phase 3 Feature Gating is complete. Migration `008-phase3-feature-gating.sql` was applied; live RPC/REST auth tests passed; production Free → Pro → Free revocation smoke passed; admin permanent Pro was already verified; `/api/me` and related routes are healthy; the full suite passed with 272 passed and 2 skipped; production build passed.
- Phase 4 Polish + Hardening is current.

## Database Schema

### Tables

1. **users** - User accounts linked to Google OAuth
   - Stores user profile, Google ID, tier, and personal Google Sheet ID
   - Each user gets their own Google Sheet for data isolation

2. **payments** - Payment proofs for tier upgrades
   - Tracks QRIS payment proofs and approval status
   - Phase 2 app routes and admin UI are complete

3. **usage** - Feature usage tracking
   - Tracks usage per user per feature per period
   - Enforces Phase 3 Free-tier transaction quotas

4. **feature_flags** - Global feature toggles
   - Enables gradual rollout of features
   - Admin dashboard toggles are planned; backend flags can be managed directly for now

5. **admins** - Admin user emails
   - Stores admin emails for privileged operations

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to Supabase and create a project.
2. Save the database password securely.
3. Pick the closest region for Indonesian users.

### Step 2: Get API Credentials

In Supabase dashboard, open Settings -> API and copy:

- Project URL
- anon/public key
- service_role key

### Step 3: Run Database Schema

Run the SQL files in order:

1. `001-schema.sql`
2. `002-rls.sql`
3. `003-functions.sql`
4. `004-views.sql`
5. `005-seed.sql`
6. `006-transaction-tables.sql`
7. `007-payments-phase2.sql`
8. `008-phase3-feature-gating.sql`

### Step 4: Add Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Step 5: Add Admin User

```sql
INSERT INTO admins (email) VALUES (lower(trim('your-email@gmail.com')));
```

Every normalized email in `admins` receives effective Pro access. Migration
008 deduplicates and normalizes existing admin emails and restricts backend-only
RPCs to the service role.

## Free Tier Limits

| Feature | Free | Paid |
|---|---:|---:|
| Transactions | 75/month | Unlimited |
| Budgets | 3 | Unlimited |
| Goals | 1 | Unlimited |
| Debts/piutang | 3 | Unlimited |
| Momental events | 1 | Unlimited |
| Bills | 3 | Unlimited |
| Insights | 3/week | Unlimited |
| History | 4 months | Unlimited |

## Google Sheets Structure

Each user gets a personal Google Sheet with 10 tabs: `Pemasukan`, `Pengeluaran`, `Tabungan`, `Budgets`, `Goals`, `Utang`, `Momental`, `EventBudgets`, `Tagihan`, and `Settings`.

## Migration From Shared Sheet

Normal users get app-created sheets. The configured `LEGACY_SHEET_OWNER_EMAIL` can connect an existing private spreadsheet through the legacy sheet connector.
