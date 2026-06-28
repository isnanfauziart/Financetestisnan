# Artami Finance Dashboard — System Flow

**Date:** June 27, 2026
**Purpose:** Complete flow documentation for how the app works — user journey, payments, admin tasks, feature gating, and data flow.

---

## 1. User Journey Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Discovery → TikTok, Instagram, Google, referral              │
│       ↓                                                          │
│  2. Landing Page → "Bayar sekali, pakai selamanya"               │
│       ↓                                                          │
│  3. Sign Up → Google OAuth (one tap)                             │
│       ↓                                                          │
│  4. Onboarding → App creates Google Sheet in user's Drive        │
│       ↓                                                          │
│  5. Free Usage → 75 txn/month, 3 budgets, 1 goal                │
│       ↓                                                          │
│  6. Hits Limit → "Upgrade ke Pro untuk unlimited"                │
│       ↓                                                          │
│  7. Payment → Scan QRIS → Upload proof                          │
│       ↓                                                          │
│  8. Admin Verifies → Approves in /admin dashboard                │
│       ↓                                                          │
│  9. Pro Unlocked → Unlimited everything, smart features          │
│       ↓                                                          │
│  10. Retention → Daily/weekly engagement, referrals              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Sign Up Flow

### 2.1 How User Signs Up

```
User visits artami.app
        ↓
Clicks "Masuk" or "Daftar"
        ↓
Google OAuth popup appears
        ↓
User selects Google account
        ↓
User grants permissions:
  ✅ Create/manage spreadsheets in Drive
  ✅ See email address
        ↓
App receives OAuth tokens (stored in JWT, server-side only)
        ↓
App checks Supabase: "Does this user exist?"
        ↓
┌───────────────────────────────────────┐
│  YES → Return existing user           │
│  NO  → Create new user + Google Sheet │
└───────────────────────────────────────┘
        ↓
User sees dashboard with their data
```

### 2.2 New User Provisioning (Automated)

When a NEW user signs up for the first time:

```
1. App creates row in Supabase `users` table:
   {
     id: UUID,
     email: "user@gmail.com",
     name: "User Name",
     avatar_url: "https://...",
     google_id: "123456789",
     tier: "free",
     spreadsheet_id: null
   }

2. App calls Google Sheets API to create spreadsheet:
   POST https://sheets.googleapis.com/v4/spreadsheets
   {
     title: "Artami Finance - User Name - 2026-06-27",
     sheets: [
       { title: "Pemasukan" },
       { title: "Pengeluaran" },
       { title: "Tabungan" },
       { title: "Budgets" },
       { title: "Goals" },
       { title: "Utang" },
       { title: "Momental" },
       { title: "EventBudgets" },
       { title: "Tagihan" },
       { title: "Settings" }
     ]
   }

3. App writes headers to each tab (A1:M1 for transactions, etc.)

4. App saves spreadsheet_id to Supabase:
   UPDATE users SET spreadsheet_id = "abc123..." WHERE id = "user-uuid"

5. User sees empty dashboard — ready to start tracking
```

### 2.3 What User Sees After Sign Up

```
┌─────────────────────────────────────────────────────────────┐
│  HOME TAB                                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Net Worth: Rp 0                                    │    │
│  │  (No data yet — add transactions to see)            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Income   │  │ Expense  │  │ Savings  │                  │
│  │ Rp 0     │  │ Rp 0     │  │ Rp 0     │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Recent Transactions                                │    │
│  │  (empty — "Belum ada transaksi")                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [Tambah Transaksi] ← User taps here to start              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Free Tier Flow

### 3.1 What Free Users Can Do

```
FREE TIER LIMITS:
├── Transactions: 75/month (resets on 1st of each month)
├── History: 4 months (can see last 4 months of data)
├── Budgets: 3 categories
├── Goals: 1 savings goal
├── Insights: 3/week (resets every Monday)
├── Custom categories: Unlimited ✅
├── All bank accounts: Unlimited ✅
├── Net Worth: ✅
├── Charts (current month): ✅
├── Month comparison: ✅
├── Calendar heatmap: ✅
├── PDF report: ✅ (watermarked "ARTOKU FREE")
├── Google Sheets sync: ✅
└── Edit/Delete: ✅
```

### 3.2 How Limits Are Enforced

```
User taps "Tambah Transaksi"
        ↓
App sends POST to /api/transaction
        ↓
Server checks Supabase `usage` table:
  SELECT count FROM usage
  WHERE user_id = ? AND feature = 'transactions'
  AND period = '2026-06'
        ↓
┌───────────────────────────────────────┐
│  count < 75 → Allow transaction       │
│  count >= 75 → Return 403 + upgrade   │
└───────────────────────────────────────┘
        ↓
If allowed:
  1. Write to Google Sheets
  2. Increment usage count
  3. Return success

If blocked:
  1. Return { error: "Batas transaksi tercapai", upgrade: true }
  2. Show upgrade prompt to user
```

### 3.3 Usage Counter Behavior

| Feature | Counter | Period | Reset |
|---------|---------|--------|-------|
| Transactions | `transactions` | Monthly | 1st of month |
| Budgets | `budgets_created` | Cumulative | Never (total count) |
| Goals | `goals_created` | Cumulative | Never (total count) |
| Insights | `insights` | Weekly | Every Monday |

**Note:** Budgets and Goals are cumulative — if user creates 3 budgets, they can't create more unless they delete one AND upgrade to Pro.

---

## 4. Payment Flow (How User Buys Pro)

### 4.1 User Sees Upgrade Prompt

```
User hits limit (75 transactions, or tries 4th budget, etc.)
        ↓
App shows upgrade modal/bottom sheet:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  🎯 Kamu sudah mencapai batas!                              │
│                                                              │
│  Upgrade ke Artami Pro untuk:                                │
│  ✅ Transaksi tanpa batas                                    │
│  ✅ Budget tanpa batas                                       │
│  ✅ Tujuan tabungan tanpa batas                              │
│  ✅ Fitur pintar (Health Score, Forecast, Anomaly)           │
│  ✅ Laporan PDF tanpa watermark                              │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│  Rp 49.000 — Sekali Bayar, Selamanya                        │
│  (Kurang dari 2 kopi Starbucks)                             │
│                                                              │
│  [ Upgrade Sekarang ]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Payment Screen

```
User taps "Upgrade Sekarang"
        ↓
App navigates to /upgrade or shows payment modal:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Pembayaran — Artami Pro                                     │
│                                                              │
│  Harga: Rp 49.000                                            │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  Cara Bayar:                                                 │
│  1. Scan QRIS di bawah                                       │
│     [QR CODE IMAGE]                                          │
│                                                              │
│  2. Atau transfer ke:                                        │
│     Bank: BCA                                                │
│     No. Rek: 1234567890                                      │
│     A/N: Your Name                                           │
│                                                              │
│  3. Upload bukti pembayaran:                                 │
│     [ Pilih File ]                                           │
│                                                              │
│  4. Tunggu verifikasi (biasanya < 24 jam)                    │
│                                                              │
│  [ Kirim Bukti Pembayaran ]                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 What Happens After Upload

```
User uploads screenshot + submits
        ↓
App sends POST to /api/payments (FormData with proof image)
        ↓
Server:
  1. Upload proof to Supabase Storage (payment-proofs bucket)
  2. Create row in `payments` table:
     {
       id: UUID,
       user_id: "user-uuid",
       amount: 49000,
       proof_url: "https://...",
       status: "pending",
       created_at: "2026-06-27T10:30:00Z"
     }
  3. Return success to user
        ↓
User sees: "Bukti pembayaran berhasil dikirim. Menunggu verifikasi."
        ↓
User can continue using free features while waiting
```

### 4.4 Admin Verification (You)

```
You (admin) receive notification or check /admin dashboard
        ↓
Open /admin in browser
        ↓
See list of pending payments:
┌─────────────────────────────────────────────────────────────┐
│  Admin — Pembayaran                                          │
│                                                              │
│  [Menunggu] [Disetujui] [Ditolak]                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  user@gmail.com                                      │    │
│  │  Rp 49.000                                           │    │
│  │  27 Jun 2026, 10:30                                  │    │
│  │  [Lihat Bukti] ← opens screenshot                   │    │
│  │                                                      │    │
│  │  [✅ Setujui]  [❌ Tolak]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
        ↓
You verify in your bank app:
  - Check if Rp 49,000 received
  - Check if sender matches user email
        ↓
┌───────────────────────────────────────┐
│  MATCH → Click "Setujui"              │
│  NO MATCH → Click "Tolak"             │
└───────────────────────────────────────┘
```

### 4.5 What Happens When Approved

```
Admin clicks "Setujui"
        ↓
Server (PUT /api/admin/payments):
  1. Update payment status:
     UPDATE payments SET status = 'approved', reviewed_by = 'admin@email.com' WHERE id = ?

  2. Upgrade user tier:
     UPDATE users SET tier = 'paid', updated_at = now() WHERE id = ?
        ↓
User's next API call will see tier = 'paid'
        ↓
All limits removed:
  - Transactions: Unlimited
  - Budgets: Unlimited
  - Goals: Unlimited
  - Insights: Unlimited
  - Smart Features: Unlocked
  - PDF: No watermark
        ↓
User sees: "Selamat! Kamu sekarang Artami Pro member 🎉"
```

### 4.6 What Happens When Rejected

```
Admin clicks "Tolak"
        ↓
Server:
  1. Update payment status:
     UPDATE payments SET status = 'rejected', reviewed_by = 'admin@email.com' WHERE id = ?
        ↓
User sees: "Pembayaran ditolak. Silakan hubungi support."
        ↓
User can submit again with correct proof
```

---

## 5. Admin Flow (What YOU Do)

### 5.1 Daily Admin Tasks

```
DAILY (5-10 minutes):
├── Check /admin dashboard for pending payments
├── Verify payments against bank app
├── Approve/reject payments
└── Respond to support emails (if any)

WEEKLY (15-30 minutes):
├── Check Vercel logs for errors
├── Check Supabase for unusual activity
└── Review user feedback
```

### 5.2 How to Access Admin Dashboard

```
1. Go to artami.app/admin
2. Sign in with your Google account (the one in `admins` table)
3. See pending payments
4. Click "Lihat Bukti" to view screenshot
5. Verify in your bank app
6. Click "Setujui" or "Tolak"
```

### 5.3 How to Seed Yourself as Admin

```sql
-- Run in Supabase SQL Editor (one-time setup)
INSERT INTO admins (email) VALUES ('your-email@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

### 5.4 How to Manually Upgrade a User

```sql
-- Run in Supabase SQL Editor (if needed)
UPDATE users SET tier = 'paid', updated_at = now() WHERE email = 'user@gmail.com';
```

---

## 6. Feature Gating Flow

### 6.1 How Free vs Paid Works

```
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE GATING                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User makes API request                                      │
│         ↓                                                    │
│  Server checks: user.tier (from Supabase)                    │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  tier = 'free'                                      │    │
│  │  ├── Check usage limits                             │    │
│  │  ├── Gate smart features                            │    │
│  │  └── Return limited data                            │    │
│  └─────────────────────────────────────────────────────┘    │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  tier = 'paid'                                      │    │
│  │  ├── Skip usage limits                              │    │
│  │  ├── Include smart features                         │    │
│  │  └── Return full data                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Gate Decision Matrix

| Feature | Free | Paid | Gate Type |
|---------|------|------|-----------|
| Transactions | 75/month | Unlimited | Count-based (hard block at 75) |
| Budgets | 3 total | Unlimited | Count-based (hard block at 3) |
| Goals | 1 total | Unlimited | Count-based (hard block at 1) |
| Insights | 3/week | Unlimited | Count-based (soft - show "upgrade" message) |
| Health Score | null | Full data | Boolean (return null for free) |
| Cash Flow Forecast | null | Full data | Boolean (return null for free) |
| Anomaly Alerts | null | Full data | Boolean (return null for free) |
| PDF Report | Watermarked | No watermark | Boolean (add "ARTOKU FREE" text) |
| Momental | 1 event | Unlimited | Count-based (hard block at 1) |
| Bills | 3 bills | Unlimited | Count-based (hard block at 3) |

### 6.3 API Response for Blocked Feature

```json
// When free user hits transaction limit
{
  "error": "Batas transaksi bulanan tercapai (75/75)",
  "upgrade": true,
  "current": 75,
  "limit": 75
}
// HTTP Status: 403
```

### 6.4 How Client Handles 403 + upgrade: true

```
Client receives 403 response with { upgrade: true }
        ↓
Show upgrade modal/bottom sheet:
┌─────────────────────────────────────────────────────────────┐
│  🎯 Batas transaksi tercapai                                │
│                                                              │
│  Upgrade ke Pro untuk transaksi tanpa batas                  │
│                                                              │
│  [ Upgrade — Rp 49.000 ]                                    │
│  [ Nanti Saja ]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Data Flow

### 7.1 Where Data Lives

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  USER'S GOOGLE DRIVE                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📊 Artami Finance - User Name - 2026-06-27         │    │
│  │  ├── Pemasukan (income transactions)                │    │
│  │  ├── Pengeluaran (expense transactions)             │    │
│  │  ├── Tabungan (savings transactions)                │    │
│  │  ├── Budgets (monthly limits)                       │    │
│  │  ├── Goals (savings targets)                        │    │
│  │  ├── Utang (debts)                                  │    │
│  │  ├── Momental (events/milestones)                   │    │
│  │  ├── EventBudgets (event sub-categories)            │    │
│  │  ├── Tagihan (bill reminders)                       │    │
│  │  └── Settings (user preferences)                    │    │
│  │                                                     │    │
│  │  ✅ User owns this 100%                             │    │
│  │  ✅ Can open in Google Sheets anytime               │    │
│  │  ✅ Can edit manually (changes sync to app)         │    │
│  │  ✅ Can export/download anytime                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  SUPABASE (YOUR DATABASE)                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  users                                              │    │
│  │  ├── id, email, name, avatar_url                    │    │
│  │  ├── google_id, spreadsheet_id                      │    │
│  │  └── tier (free/paid)                               │    │
│  │                                                     │    │
│  │  payments                                           │    │
│  │  ├── id, user_id, amount, proof_url                 │    │
│  │  └── status (pending/approved/rejected)             │    │
│  │                                                     │    │
│  │  usage                                              │    │
│  │  ├── user_id, feature, count, period                │    │
│  │  └── (tracks monthly/weekly usage)                  │    │
│  │                                                     │    │
│  │  feature_flags                                      │    │
│  │  └── key, enabled (toggle features)                 │    │
│  │                                                     │    │
│  │  admins                                             │    │
│  │  └── email (who can access /admin)                  │    │
│  │                                                     │    │
│  │  ❌ NO financial data stored here                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Read Flow (Dashboard Load)

```
User opens app
        ↓
GET /api/dashboard
        ↓
Server:
  1. Get user from Supabase (via getAuthContext)
  2. Get user's spreadsheet_id
  3. Call Google Sheets API:
     GET /spreadsheets/{spreadsheetId}/values/Pemasukan!A:M
     GET /spreadsheets/{spreadsheetId}/values/Pengeluaran!A:M
     GET /spreadsheets/{spreadsheetId}/values/Tabungan!A:M
  4. Parse rows → compute totals, charts, insights
  5. Check tier → include/exclude smart features
  6. Return JSON to client
        ↓
Client renders dashboard with user's data
```

### 7.3 Write Flow (Add Transaction)

```
User taps "Tambah Transaksi"
        ↓
POST /api/transaction
        ↓
Server:
  1. Check auth (getToken)
  2. Check usage limits (75/month for free)
  3. Get user's spreadsheet_id
  4. Find next empty row in Google Sheets
  5. Write transaction data to sheet
  6. Increment usage counter in Supabase
  7. Return success
        ↓
Client shows success toast + refreshes dashboard
```

---

## 8. Google Sheets Integration

### 8.1 User Can Edit Sheets Directly

```
USER CAN:
├── Open "📊 Artami Finance" in Google Drive
├── Edit transactions directly in Sheets
├── Add rows manually
├── Delete rows
├── Export to CSV/Excel
├── Share with spouse (Google Sheets sharing)
└── Delete the sheet entirely (their choice)

APP WILL:
├── Read from Sheets on every dashboard load
├── Reflect any manual changes immediately
├── Never overwrite user's manual edits
└── Work with whatever data is in the sheet
```

### 8.2 Sheet Structure

```
Pemasukan (Income) — Columns A-M:
┌──────┬────┬─────────────┬──────────┬────────┬──────┬──────┬──────────┬──────┬────────┬─────┬─────┬─────┐
│Tgl   │ ID │ Keterangan  │ Kategori │ Jumlah │ Pajak│ Biaya│ AkunBank │ Net  │ Catatan│  M  │  Y  │ Y2  │
├──────┼────┼─────────────┼──────────┼────────┼──────┼──────┼──────────┼──────┼────────┼─────┼─────┼─────┤
│15 Jan│ tx1│ Gaji bulan  │ Gaji     │5000000 │      │      │ BCA      │5M    │        │ Jan │2026 │2026 │
└──────┴────┴─────────────┴──────────┴────────┴──────┴──────┴──────────┴──────┴────────┴─────┴─────┴─────┘

Budgets — Columns A-F:
┌──────────┬───────┬──────┬─────────┬──────┬────────┐
│ Kategori │ Bulan │ Tahun│ Limit   │ Akun │ Catatan│
├──────────┼───────┼──────┼─────────┼──────┼────────┤
│ Makan    │ Jan   │2026  │1500000  │      │        │
└──────────┴───────┴──────┴─────────┴──────┴────────┘

Goals — Columns A-H:
┌────┬──────────┬─────────┬──────────┬──────────┬─────┬───────┬──────────┐
│ ID │ Nama     │ Target  │ Deadline │ Kategori │Icon │ Color │ CreatedAt│
├────┼──────────┼─────────┼──────────┼──────────┼─────┼───────┼──────────┤
│ g1 │ Laptop   │5000000  │2026-12-31│Tabungan  │💻   │ #3B82F6│2026-01-01│
└────┴──────────┴─────────┴──────────┴──────────┴─────┴───────┴──────────┘
```

---

## 9. Supabase Schema

### 9.1 Tables

```sql
-- Users (synced from Google OAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  spreadsheet_id TEXT,
  sheet_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments (manual QRIS verification)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage tracking (for free-tier limits)
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL, -- "2026-06" for monthly, "2026-W26" for weekly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature, period)
);

-- Feature flags
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admins (who can access /admin)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9.2 Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_usage_user_feature ON usage(user_id, feature);
```

---

## 10. Environment Variables

```
# .env.local (local development)

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx

# Supabase (add after Phase 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Legacy (your personal sheet — fallback only)
SPREADSHEET_ID=xxx
```

---

## 11. API Routes Summary

| Route | Method | Purpose | Auth | Tier Check |
|-------|--------|---------|------|------------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | No | No |
| `/api/dashboard` | GET | Dashboard data | Yes | Smart features |
| `/api/transaction` | GET, POST | Transactions | Yes | 75/month limit |
| `/api/transaction/[id]` | PUT, DELETE | Edit/delete txn | Yes | No |
| `/api/budgets` | GET, POST, PUT, DELETE | Budgets CRUD | Yes | 3 max limit |
| `/api/goals` | GET, POST, PUT, DELETE | Goals CRUD | Yes | 1 max limit |
| `/api/debts` | GET, POST, PUT, DELETE | Debts CRUD | Yes | 3 max limit |
| `/api/momental` | GET, POST, PUT, DELETE | Events CRUD | Yes | 1 free limit |
| `/api/momental/[id]` | GET, PUT, DELETE | Single event | Yes | No |
| `/api/momental/summary` | GET | Event summary | Yes | No |
| `/api/bills` | GET, POST | Bills CRUD | Yes | 3 max limit |
| `/api/bills/[id]` | PUT, DELETE | Single bill | Yes | No |
| `/api/bills/pay` | POST | Pay bill | Yes | No |
| `/api/bills/summary` | GET | Bill summary | Yes | No |
| `/api/settings` | GET, PUT | User settings | Yes | No |
| `/api/payments` | GET, POST | Payment proof | Yes | No |
| `/api/admin/payments` | GET, PUT | Admin payments | Yes (admin) | No |
| `/api/me` | GET | User profile | Yes | No |
| `/api/me/upgrade` | GET | Upgrade info | Yes | No |
| `/api/health` | GET | Health check | No | No |

---

## 12. File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js
│   │   ├── dashboard/route.js
│   │   ├── transaction/route.js
│   │   ├── transaction/[id]/route.js
│   │   ├── budgets/route.js
│   │   ├── goals/route.js
│   │   ├── debts/route.js
│   │   ├── momental/route.js
│   │   ├── momental/[id]/route.js
│   │   ├── momental/summary/route.js
│   │   ├── bills/route.js
│   │   ├── bills/[id]/route.js
│   │   ├── bills/pay/route.js
│   │   ├── bills/summary/route.js
│   │   ├── settings/route.js
│   │   ├── payments/route.js
│   │   ├── admin/payments/route.js
│   │   ├── me/route.js
│   │   ├── me/upgrade/route.js
│   │   └── health/route.js
│   ├── admin/
│   │   └── page.js
│   └── dashboard/
│       ├── page.js
│       ├── HomeTab.jsx
│       ├── StatsTab.jsx
│       ├── WalletTab.jsx
│       └── ProfileTab.jsx
├── lib/
│   ├── sheets.js
│   ├── auth.js
│   ├── supabase.js
│   ├── supabaseAdmin.js
│   ├── user.js
│   ├── apiAuth.js
│   ├── sheetManager.js
│   ├── adminAuth.js
│   ├── tier.js
│   ├── usage.js
│   ├── featureGate.js
│   ├── rateLimit.js
│   ├── validate.js
│   ├── logger.js
│   ├── env.js
│   ├── report.js
│   ├── forecast.js
│   ├── healthScore.js
│   ├── financialHealthScore.js
│   ├── eventTemplates.js
│   ├── notifications.js
│   ├── theme.js
│   ├── parseSheetRow.js
│   └── useSharedData.js
└── components/
    ├── NetWorthCard.jsx
    ├── BudgetCard.jsx
    ├── GoalCard.jsx
    ├── BillsCard.jsx
    └── ...
```

---

*This document describes the complete system flow for Artami Finance Dashboard. Update as features evolve.*
