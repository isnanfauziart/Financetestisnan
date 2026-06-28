# Artami Finance Dashboard - Supabase Setup

## Overview

This folder contains the database schema and setup scripts for Artami Finance Dashboard's multi-tenancy system. The app uses Supabase (PostgreSQL) to store user accounts, tier information, usage tracking, and feature flags.

## Database Schema

### Tables

1. **users** - User accounts linked to Google OAuth
   - Stores user profile, Google ID, tier (free/paid), and personal Google Sheet ID
   - Each user gets their own Google Sheet for data isolation

2. **payments** - Payment proofs for tier upgrades
   - Tracks QRIS payment proofs and approval status
   - Users upload proof, admin approves/rejects

3. **usage** - Feature usage tracking
   - Tracks usage per user per feature per period
   - Enforces free tier limits (e.g., 75 transactions/month)

4. **feature_flags** - Global feature toggles
   - Enables gradual rollout of features
   - Can be toggled via admin dashboard

5. **admins** - Admin user emails
   - Stores admin emails for privileged operations

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name:** `artami-finance` (or your preferred name)
   - **Database Password:** Generate a strong password (save it securely)
   - **Region:** Choose closest to your users (e.g., Southeast Asia)
4. Click "Create new project"
5. Wait for project to be ready (2-3 minutes)

### Step 2: Get API Credentials

Once project is ready:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefghij.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...` - keep this secret!)

### Step 3: Run Database Schema

Execute the SQL files in order:

1. **001-schema.sql** - Creates tables and indexes
2. **002-rls.sql** - Enables Row Level Security policies
3. **003-functions.sql** - Creates database functions
4. **004-views.sql** - Creates database views
5. **005-seed.sql** - Inserts default feature flags

To run:
1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy and paste the contents of each file
4. Click "Run" (or press Ctrl+Enter)
5. Repeat for each file in order

### Step 4: Add Environment Variables

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon/public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # service_role key (keep secret!)
```

### Step 5: Add Admin User

After running the schema, add your admin email:

```sql
INSERT INTO admins (email) VALUES ('your-email@gmail.com');
```

## Row Level Security (RLS)

The schema includes RLS policies for data isolation:

- **Users** can only read/update their own profile
- **Admins** can read all users and manage payments
- **Service role** (backend) has full access for API operations
- **Feature flags** are publicly readable

## Database Functions

- `increment_usage(user_id, feature, period)` - Track feature usage
- `check_usage_limit(user_id, feature, period, limit)` - Check if user has exceeded limit
- `get_user_by_email(email)` - Find user by email
- `is_admin(email)` - Check if user is admin
- `is_feature_enabled(key)` - Check if feature is enabled

## Views

- `user_dashboard_summary` - User profile with payment stats
- `admin_users_view` - Admin view with usage and payment info
- `usage_analytics` - Usage analytics across all users
- `payment_analytics` - Payment statistics by month
- `active_users` - User activity tracking

## Free Tier Limits

| Feature       | Free Tier | Paid Tier (Rp 49,000) |
|--------------|-----------|----------------------|
| Transactions | 75/month  | Unlimited            |
| Budgets      | 3         | Unlimited            |
| Goals        | 1         | Unlimited            |
| Insights     | 3/week    | Unlimited            |
| History      | 4 months  | Unlimited            |

## Google Sheets Structure

Each user gets a personal Google Sheet with 10 tabs:

1. **Pemasukan** - Income transactions
2. **Pengeluaran** - Expense transactions
3. **Tabungan** - Savings transactions
4. **Budgets** - Per-category monthly limits
5. **Goals** - Savings goals
6. **Utang** - Debts/piutang
7. **Momental** - Event/milestone budgets
8. **EventBudgets** - Event sub-categories
9. **Tagihan** - Bill reminders
10. **Settings** - Key-value settings

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran the SQL files in order
- Check that you're in the correct schema (public)

### Error: "permission denied"
- Ensure RLS policies are created correctly
- Check that you're using the service_role key for backend operations

### Users can see other users' data
- Verify RLS is enabled on all tables
- Check that policies are using `auth.uid()` correctly

## Migration from Shared Sheet

If migrating from the legacy shared sheet:

```bash
node scripts/migrate-user.js <email>
```

This will:
1. Find the user in Supabase
2. Get their personal sheet ID
3. Provide instructions for data migration

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Google Sheets API](https://developers.google.com/sheets/api)
