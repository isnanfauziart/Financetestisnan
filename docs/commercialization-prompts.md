# Artami Finance Dashboard — Commercialization Prompts

6 self-contained prompts for separate opencode sessions. Run them in order (0→5).
Each prompt includes all context needed — no prior session memory required.

---

## PHASE 0: SECURITY FIXES (do first, standalone) ✅ DONE

> **Status: COMPLETED.** All 5 vulnerabilities have been fixed. Phase 0 is documented here for reference only — do NOT re-implement.

### CONTEXT

You are working on **Artami Finance Dashboard**, a Next.js 14 App Router finance app deployed on Vercel. It uses:
- **NextAuth v4** with Google OAuth for authentication
- **Google Sheets API** as the database (user's own spreadsheet)
- **JavaScript only** (no TypeScript)
- Path alias `@/*` → `./src/*` (via `jsconfig.json`)

There are 5 critical security vulnerabilities that must be fixed before any other work. These are production-blocking.

### YOUR TASK

Fix all 5 security vulnerabilities listed below. Each fix is independent — implement all of them.

### FILES TO READ FIRST

1. `src/app/api/auth/[...nextauth]/route.js` — NextAuth config (43 lines)
2. `src/app/api/transaction/[id]/route.js` — Edit/delete transaction API (120 lines)
3. `src/app/api/transaction/route.js` — Create transaction API (93 lines)
4. `src/app/api/dashboard/route.js` — Dashboard data API (180 lines)
5. `src/app/api/budgets/route.js` — Budgets CRUD API (210 lines)
6. `src/app/api/goals/route.js` — Goals CRUD API (190 lines)
7. `next.config.js` — Currently empty config (4 lines)
8. `src/lib/auth.js` — Token refresh helper (26 lines)

### VULNERABILITY 1: Access Token Leaked to Client Session

**File**: `src/app/api/auth/[...nextauth]/route.js`

**Problem**: Line 35 (`session.accessToken = token.accessToken`) exposes the Google OAuth access token to the client-side session object. Any XSS attack or browser extension can steal it and access the user's Google Sheets.

**Fix**:
```js
// In the session callback, REMOVE session.accessToken:
async session({ session, token }) {
  // DO NOT set session.accessToken here
  if (token.error) session.error = token.error
  return session
}
```

Then update every API route that currently reads `session.accessToken` to instead use `getToken()` from `next-auth/jwt`:

```js
import { getToken } from "next-auth/jwt"

export async function GET(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken
  // ... use accessToken
}
```

**Files to update** (all 6 API routes):
- `src/app/api/dashboard/route.js` — lines 9-10
- `src/app/api/transaction/route.js` — lines 49-50
- `src/app/api/transaction/[id]/route.js` — lines 23-24 (PUT), 84-85 (DELETE)
- `src/app/api/budgets/route.js` — lines 87-88 (GET), 111-112 (POST), 148-149 (PUT), 187-188 (DELETE)
- `src/app/api/goals/route.js` — lines 79-80 (GET), 94-95 (POST), 127-128 (PUT), 167-168 (DELETE)

**Pattern for each route handler**:
```js
// BEFORE (insecure):
const session = await getServerSession(authOptions)
if (!session?.accessToken) { ... }
// use session.accessToken

// AFTER (secure):
const token = await getToken({ req: request })
if (!token?.accessToken) { ... }
const accessToken = token.accessToken
// use accessToken instead of session.accessToken
```

Note: For route handlers that don't have `request` in their signature (like `GET()` in dashboard), you need to add it: `export async function GET(request)`.

### VULNERABILITY 2: User-Controlled `tab` Parameter (Sheets Injection)

**File**: `src/app/api/transaction/[id]/route.js`

**Problem**: The `tab` field from the request body is used directly in the Sheets API range (`${tab}!A${rowIndex}:M${rowIndex}`). A malicious user could send `tab: "OtherSheet!A1:Z9999"` or access arbitrary sheets.

**Fix**: Add a whitelist at the top of the file:
```js
const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]

// In PUT handler, after parsing body:
if (!ALLOWED_TABS.includes(tab)) {
  return Response.json({ error: "Invalid tab" }, { status: 400 })
}

// In DELETE handler, same check after parsing body:
if (!ALLOWED_TABS.includes(tab)) {
  return Response.json({ error: "Invalid tab" }, { status: 400 })
}
```

### VULNERABILITY 3: No Input Validation on Transaction Creation

**File**: `src/app/api/transaction/route.js`

**Problem**: The `jumlah` (amount) field is parsed with `parseFloat` but has no bounds check. A user could submit `jumlah: 99999999999999999` or negative numbers. String fields like `keterangan` have no length limit.

**Fix**: Add validation after parsing body in the POST handler:
```js
// After: const { type, tanggal, keterangan, kategori, jumlah, akunBank, catatan } = body

// Validate amount bounds
const amount = parseFloat(String(jumlah).replace(/[^0-9.]/g, ""))
if (isNaN(amount) || amount <= 0 || amount > 999999999999) {
  return Response.json({ error: "Jumlah harus antara 1 dan 999.999.999.999" }, { status: 400 })
}

// Validate string lengths
if (keterangan && keterangan.length > 500) {
  return Response.json({ error: "Keterangan maksimal 500 karakter" }, { status: 400 })
}
if (kategori && kategori.length > 100) {
  return Response.json({ error: "Kategori maksimal 100 karakter" }, { status: 400 })
}
if (catatan && catatan.length > 1000) {
  return Response.json({ error: "Catatan maksimal 1000 karakter" }, { status: 400 })
}
if (akunBank && akunBank.length > 100) {
  return Response.json({ error: "Akun bank maksimal 100 karakter" }, { status: 400 })
}

// Validate type
const ALLOWED_TYPES = ["income", "expense", "savings"]
if (type && !ALLOWED_TYPES.includes(type)) {
  return Response.json({ error: "Tipe transaksi tidak valid" }, { status: 400 })
}
```

Remove the duplicate `const amount = parseFloat(...)` line that currently exists at line 65 since you're now defining it in the validation block above.

### VULNERABILITY 4: Error Messages Leak Internal Details

**Files**: All 6 API routes

**Problem**: All catch blocks return `err.message` directly, which can leak Google Sheets API errors, internal stack traces, or database details to the client.

**Fix**: In every catch block across all API routes, replace:
```js
// BEFORE:
return Response.json({ error: err.message }, { status: 500 })

// AFTER:
console.error("[RouteName]", err)
return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
```

The `console.error` still logs the full error for server-side debugging (visible in Vercel logs). The client only sees a generic message.

Apply this to every `catch` block in:
- `src/app/api/dashboard/route.js`
- `src/app/api/transaction/route.js`
- `src/app/api/transaction/[id]/route.js`
- `src/app/api/budgets/route.js`
- `src/app/api/goals/route.js`

### VULNERABILITY 5: No Security Headers

**File**: `next.config.js`

**Problem**: The config is empty — no security headers are set. The app is vulnerable to clickjacking, MIME sniffing, and lacks CSP.

**Fix**: Replace the entire contents of `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

Note: We intentionally skip Content-Security-Policy (CSP) for now because the app uses inline scripts/styles from Next.js and Recharts. Adding CSP requires careful nonce configuration that can break the app. We'll address CSP in a later hardening phase.

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Next.js 14 App Router** — use `Response.json()` for responses
- Do NOT change any UI components or client-side code
- Do NOT add new dependencies
- Preserve all existing functionality — these are security-only changes
- Keep `getServerSession` import in files that still need it for other purposes, but use `getToken` for access token retrieval
- The `getToken` function from `next-auth/jwt` automatically reads the JWT from the request cookies — no secret needed in the call

### VERIFICATION

After implementing all fixes:

1. **Build check**: Run `npm run build` — must succeed with no errors
2. **Token leak check**: Open browser DevTools → Application → Cookies. The `next-auth.session-token` cookie should be an encrypted JWT. In DevTools Console, run `fetch('/api/auth/session').then(r=>r.json()).then(console.log)` — the session object should NOT contain `accessToken`.
3. **Tab injection check**: Send a POST to `/api/transaction/[any-id]` with body `{tab: "EvilSheet", rowIndex: 1, ...}` — should return 400 "Invalid tab"
4. **Amount bounds check**: POST to `/api/transaction` with `{jumlah: -500, ...}` — should return 400. Same with `jumlah: 99999999999999999`.
5. **Error message check**: Temporarily break something (e.g., set SPREADSHEET_ID to invalid) and hit `/api/dashboard` — response should say "Terjadi kesalahan internal", NOT show the Google API error.
6. **Headers check**: Run `curl -I http://localhost:3000` — response should include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, etc.

---

## PHASE 1: SUPABASE FOUNDATION + MULTI-TENANCY

### CONTEXT

You are working on **Artami Finance Dashboard**, a Next.js 14 App Router finance app. Phase 0 (security fixes) is complete — all API routes use `getToken()` from `next-auth/jwt`, error messages are generic, and security headers are in place.

The app currently uses a single shared Google Sheet (from `SPREADSHEET_ID` env var) for all data. We need to make it multi-tenant so each user gets their own Google Sheet.

**Current architecture** (after Phase 0):
- NextAuth v4 with Google OAuth (stores `accessToken` in JWT, not session)
- **15 API routes** all read `process.env.SPREADSHEET_ID` directly via `src/lib/sheets.js`
- `src/lib/sheets.js` has `getSheetData(accessToken, range)` that hardcodes spreadsheetId from env
- **10 Google Sheets tabs**: `Pemasukan`, `Pengeluaran`, `Tabungan`, `Budgets`, `Goals`, `Utang`, `Momental`, `EventBudgets`, `Tagihan`, `Settings`

**Current API routes** (all use `getToken()` pattern):
1. `src/app/api/dashboard/route.js` — Main dashboard aggregation (GET)
2. `src/app/api/transaction/route.js` — Transaction CRUD (GET, POST)
3. `src/app/api/transaction/[id]/route.js` — Transaction edit/delete (PUT, DELETE)
4. `src/app/api/budgets/route.js` — Budgets CRUD (GET, POST, PUT, DELETE)
5. `src/app/api/goals/route.js` — Goals CRUD (GET, POST, PUT, DELETE)
6. `src/app/api/debts/route.js` — Debts CRUD (GET, POST, PUT, DELETE) + payment action
7. `src/app/api/momental/route.js` — Event/milestone planning (GET, POST, PUT, DELETE)
8. `src/app/api/momental/[id]/route.js` — Single event detail + update/delete (GET, PUT, DELETE)
9. `src/app/api/momental/summary/route.js` — Active event summary (GET)
10. `src/app/api/bills/route.js` — Bill reminders CRUD (GET, POST)
11. `src/app/api/bills/[id]/route.js` — Single bill update/delete (PUT, DELETE)
12. `src/app/api/bills/pay/route.js` — Pay bill → auto-create transaction (POST)
13. `src/app/api/bills/summary/route.js` — Bill summary for notifications (GET)
14. `src/app/api/settings/route.js` — User settings (GET, PUT)
15. `src/app/api/auth/[...nextauth]/route.js` — NextAuth config (GET, POST)

**Current lib files**:
- `src/lib/sheets.js` — `getSheetData(accessToken, range)`, `parseRupiah()`, `formatRupiah()`
- `src/lib/auth.js` — Token refresh helper (`refreshAccessToken`)
- `src/lib/eventTemplates.js` — Event templates for Momental feature
- `src/lib/notifications.js` — Service worker registration + notification helpers
- `src/lib/report.js` — PDF report generation
- `src/lib/forecast.js` — Cash flow forecasting
- `src/lib/healthScore.js` — Financial health score
- `src/lib/financialHealthScore.js` — Alternative health score
- `src/lib/theme.js` — Theme configuration
- `src/lib/parseSheetRow.js` — Sheet row parsing
- `src/lib/useSharedData.js` — Client-side data caching hook

**Target architecture**:
- Supabase (PostgreSQL) stores user accounts, tier info, usage tracking
- Each user gets their own Google Sheet created via Sheets API on first login
- All 14 data API routes read the user's spreadsheetId from Supabase instead of env var
- The env var `SPREADSHEET_ID` becomes the "legacy/admin" sheet only

**Architecture decision (after implementation):**
- Data stays in Google Sheets (not Supabase) for reliability and APK compatibility
- Supabase used only for user management (accounts, tiers, payments, feature flags)
- This approach avoids data sync issues between Google Sheets and Supabase
- APK (TWA) writes to Google Sheets directly, web app reads from same sheets
- No data migration needed — existing data stays in place

### YOUR TASK

Build the Supabase foundation and multi-tenancy system. This is the biggest phase — follow the steps in order.

### STEP 1: Install Supabase

```bash
npm install @supabase/supabase-js
```

### STEP 2: Create Supabase Client Helpers

**Create `src/lib/supabase.js`** (browser/client-side Supabase client):
```js
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Create `src/lib/supabaseAdmin.js`** (server-side admin client with service role key):
```js
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase admin env vars not set")
}

export const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

### STEP 3: Database Schema (run in Supabase SQL Editor)

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
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

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL, -- e.g. "2026-01" for monthly, "2026-W03" for weekly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature, period)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_usage_user_feature ON usage(user_id, feature);

-- Insert default feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('budgets_enabled', true, 'Budget tracking feature'),
  ('goals_enabled', true, 'Savings goals feature'),
  ('momental_enabled', true, 'Event/milestone budget planning'),
  ('bills_enabled', true, 'Bill reminders and auto-pay'),
  ('smart_insights', true, 'AI-powered spending insights'),
  ('pdf_reports', true, 'PDF report generation'),
  ('health_score', true, 'Financial health score'),
  ('forecast', true, 'Cash flow forecasting')
ON CONFLICT (key) DO NOTHING;
```

### STEP 4: Add `drive.file` OAuth Scope

**Modify `src/app/api/auth/[...nextauth]/route.js`**:

Update the scope in the GoogleProvider authorization params:
```js
scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
```

`drive.file` lets the app create new files (Google Sheets) in the user's Drive — it only grants access to files the app creates, not existing files.

### STEP 5: Create Sheet Manager

**Create `src/lib/sheetManager.js`**:

This must create ALL 10 tabs that the app uses. The current codebase has these tabs:
- `Pemasukan` (income) — columns A-M: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2
- `Pengeluaran` (expenses) — columns A-M: same layout
- `Tabungan` (savings) — columns A-M: same layout
- `Budgets` — columns A-F: Kategori | Bulan | Tahun | Limit | Akun | Catatan
- `Goals` — columns A-H: ID | Nama | Target | Deadline | Kategori | Icon | Color | CreatedAt
- `Utang` (debts) — columns A-I: ID | NamaOrang | Jumlah | Arah | JatuhTempo | Status | SisaSaldo | Catatan | CreatedAt
- `Momental` (events) — columns A-K: ID | Nama | Tipe | TanggalMulai | TanggalSelesai | TotalBudget | Mode | Status | DanaTHR | Catatan | CreatedAt
- `EventBudgets` — columns A-F: EventID | SubKategori | Limit | Icon | Color | Catatan
- `Tagihan` (bills) — columns A-M: ID | Nama | Jumlah | Tipe | KategoriBill | KategoriTransaksi | Frekuensi | TanggalJatuhTempo | AkunBank | Aktif | TerakhirDibayar | Catatan | CreatedAt
- `Settings` — columns A-B: Key | Value

```js
const TX_HEADERS = [["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2"]]

const ALL_TABS = [
  // Transaction tabs (A-M, 13 columns)
  { name: "Pemasukan", headers: TX_HEADERS, cols: 13 },
  { name: "Pengeluaran", headers: TX_HEADERS, cols: 13 },
  { name: "Tabungan", headers: TX_HEADERS, cols: 13 },
  // Budgets (A-F, 6 columns)
  { name: "Budgets", headers: [["Kategori", "Bulan", "Tahun", "Limit", "Akun", "Catatan"]], cols: 6 },
  // Goals (A-H, 8 columns)
  { name: "Goals", headers: [["ID", "Nama", "Target", "Deadline", "Kategori", "Icon", "Color", "CreatedAt"]], cols: 8 },
  // Debts (A-I, 9 columns)
  { name: "Utang", headers: [["ID", "NamaOrang", "Jumlah", "Arah", "JatuhTempo", "Status", "SisaSaldo", "Catatan", "CreatedAt"]], cols: 9 },
  // Events (A-K, 11 columns)
  { name: "Momental", headers: [["ID", "Nama", "Tipe", "TanggalMulai", "TanggalSelesai", "TotalBudget", "Mode", "Status", "DanaTHR", "Catatan", "CreatedAt"]], cols: 11 },
  // Event sub-budgets (A-F, 6 columns)
  { name: "EventBudgets", headers: [["EventID", "SubKategori", "Limit", "Icon", "Color", "Catatan"]], cols: 6 },
  // Bills (A-M, 13 columns)
  { name: "Tagihan", headers: [["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"]], cols: 13 },
  // Settings (A-B, 2 columns)
  { name: "Settings", headers: [["Key", "Value"]], cols: 2 },
]

export async function createUserSheet(accessToken, userName) {
  const title = `Artami Finance - ${userName || "User"} - ${new Date().toISOString().split("T")[0]}`

  // 1. Create the spreadsheet with the first 3 transaction tabs
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: ALL_TABS.slice(0, 3).map(t => ({
        properties: {
          title: t.name,
          gridProperties: { rowCount: 1000, columnCount: t.cols },
        },
      })),
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Failed to create sheet: ${err}`)
  }

  const spreadsheet = await createRes.json()
  const spreadsheetId = spreadsheet.spreadsheetId

  // 2. Write headers to the initial 3 tabs
  for (let i = 0; i < 3; i++) {
    const tab = ALL_TABS[i]
    const lastCol = String.fromCharCode(64 + tab.cols) // A=65, so 13 cols → M
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab.name + "!A1:" + lastCol + "1")}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: tab.headers }),
      }
    )
  }

  // 3. Add remaining tabs via batchUpdate
  const extraTabs = ALL_TABS.slice(3)
  const addSheetsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: extraTabs.map(t => ({
          addSheet: {
            properties: {
              title: t.name,
              gridProperties: { rowCount: 1000, columnCount: t.cols },
            },
          },
        })),
      }),
    }
  )

  if (!addSheetsRes.ok) {
    console.error("Failed to add extra tabs:", await addSheetsRes.text())
  }

  // 4. Write headers for extra tabs
  for (const tab of extraTabs) {
    const lastCol = String.fromCharCode(64 + tab.cols)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab.name + "!A1:" + lastCol + "1")}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: tab.headers }),
      }
    )
  }

  return spreadsheetId
}
```

### STEP 6: Create User Helper

**Create `src/lib/user.js`**:
```js
import { supabaseAdmin } from "./supabaseAdmin"

export async function getOrCreateUser({ email, name, avatarUrl, googleId }) {
  // Try to find existing user
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .single()

  if (existing) {
    // Update avatar/name if changed
    if (existing.name !== name || existing.avatar_url !== avatarUrl) {
      await supabaseAdmin
        .from("users")
        .update({ name, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing
  }

  // Create new user
  const { data: newUser, error: createErr } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      name,
      avatar_url: avatarUrl,
      google_id: googleId,
      tier: "free",
    })
    .select()
    .single()

  if (createErr) {
    throw new Error(`Failed to create user: ${createErr.message}`)
  }

  return newUser
}
```

### STEP 7: Create Auth Context Helper

**Create `src/lib/apiAuth.js`**:
```js
import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"
import { createUserSheet } from "./sheetManager"

export async function getAuthContext(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return null
  }

  const email = token.email
  const name = token.name
  const avatarUrl = token.picture
  const googleId = token.sub

  // Get or create user in Supabase
  const user = await getOrCreateUser({ email, name, avatarUrl, googleId })

  // If user has no spreadsheet, create one
  let spreadsheetId = user.spreadsheet_id
  if (!spreadsheetId) {
    spreadsheetId = await createUserSheet(token.accessToken, name)

    // Save spreadsheet_id to user record
    const { supabaseAdmin } = await import("./supabaseAdmin")
    await supabaseAdmin
      .from("users")
      .update({
        spreadsheet_id: spreadsheetId,
        sheet_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    user.spreadsheet_id = spreadsheetId
  }

  return {
    user,
    accessToken: token.accessToken,
    spreadsheetId: user.spreadsheet_id,
    tier: user.tier || "free",
  }
}
```

### STEP 8: Update `src/lib/sheets.js`

Modify `getSheetData` to accept an optional `spreadsheetId` parameter:

```js
export async function getSheetData(accessToken, range, spreadsheetId) {
  const sid = spreadsheetId || process.env.SPREADSHEET_ID
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(range)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }

  const data = await res.json()
  return data.values || []
}

export function parseRupiah(value) {
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

### STEP 9: Update ALL 15 API Routes

Every API route must be updated to use `getAuthContext` instead of `getToken` + hardcoded `SPREADSHEET_ID`. This is the most critical step.

**Pattern for each route**:

```js
// BEFORE:
import { getToken } from "next-auth/jwt"
import { getSheetData } from "@/lib/sheets"
// ...
const token = await getToken({ req: request })
if (!token?.accessToken) { ... }
const data = await getSheetData(token.accessToken, "Pemasukan!A:M")
// And inline sheets calls use process.env.SPREADSHEET_ID:
const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/...`

// AFTER:
import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"
// ...
const auth = await getAuthContext(request)
if (!auth) { ... }
const { accessToken, spreadsheetId } = auth
const data = await getSheetData(accessToken, "Pemasukan!A:M", spreadsheetId)
// And inline sheets calls use spreadsheetId:
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/...`
```

**Files to update (with specific changes)**:

1. **`src/app/api/dashboard/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `const token = await getToken({ req: request })` with `const auth = await getAuthContext(request)`
   - Pass `spreadsheetId` to all `getSheetData` calls

2. **`src/app/api/transaction/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `process.env.SPREADSHEET_ID` in `findNextEmptyRow` and `sheetsUpdate` with `spreadsheetId` from auth
   - Pass `spreadsheetId` to `getSheetData`

3. **`src/app/api/transaction/[id]/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `process.env.SPREADSHEET_ID` in `sheetsUpdate` with `spreadsheetId` from auth
   - Pass `spreadsheetId` to `getSheetData`

4. **`src/app/api/budgets/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace all `process.env.SPREADSHEET_ID` references
   - Pass `spreadsheetId` to `getSheetData` and inline sheets calls

5. **`src/app/api/goals/route.js`**:
   - Same pattern as budgets

6. **`src/app/api/debts/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `process.env.SPREADSHEET_ID` in `sheetsAppend`, `sheetsUpdate`, and `handlePayment` with `spreadsheetId` from auth
   - Pass `spreadsheetId` to `getSheetData`

7. **`src/app/api/momental/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `process.env.SPREADSHEET_ID` in `sheetsAppend` and `sheetsUpdate` with `spreadsheetId` from auth
   - Pass `spreadsheetId` to `getSheetData` in `fetchAllEvents`, `fetchAllSubCategories`, and `computeProgress`

8. **`src/app/api/momental/[id]/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Replace `process.env.SPREADSHEET_ID` in `sheetsUpdate` with `spreadsheetId` from auth
   - Pass `spreadsheetId` to `getSheetData`

9. **`src/app/api/momental/summary/route.js`**:
   - Replace `getToken` import with `getAuthContext`
   - Pass `spreadsheetId` to `getSheetData`

10. **`src/app/api/bills/route.js`**:
    - Replace `getToken` import with `getAuthContext`
    - Replace `process.env.SPREADSHEET_ID` in `sheetsAppend` with `spreadsheetId` from auth
    - Pass `spreadsheetId` to `getSheetData`

11. **`src/app/api/bills/[id]/route.js`**:
    - Replace `getToken` import with `getAuthContext`
    - Replace `process.env.SPREADSHEET_ID` in `sheetsUpdate` with `spreadsheetId` from auth
    - Pass `spreadsheetId` to `getSheetData`

12. **`src/app/api/bills/pay/route.js`**:
    - Replace `getToken` import with `getAuthContext`
    - Replace `process.env.SPREADSHEET_ID` in `sheetsUpdate` and `findNextEmptyRow` with `spreadsheetId` from auth
    - Pass `spreadsheetId` to `getSheetData`

13. **`src/app/api/bills/summary/route.js`**:
    - Replace `getToken` import with `getAuthContext`
    - Pass `spreadsheetId` to `getSheetData`

14. **`src/app/api/settings/route.js`**:
    - Replace `getToken` import with `getAuthContext`
    - Replace `process.env.SPREADSHEET_ID` in inline sheets calls with `spreadsheetId` from auth
    - Pass `spreadsheetId` to `getSheetData`

**IMPORTANT**: Every route has inline `fetch()` calls to the Sheets API that use `process.env.SPREADSHEET_ID` in the URL. ALL of these must be changed to use `spreadsheetId` from the auth context. Search for `process.env.SPREADSHEET_ID` in each file and replace every occurrence.

### STEP 10: Migration Script

**Create `scripts/migrate-user.js`**:
```js
// Run with: node scripts/migrate-user.js <email>
// Migrates existing data from the shared sheet to a user's new personal sheet

const { createClient } = require("@supabase/supabase-js")

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: node scripts/migrate-user.js <email>")
    process.exit(1)
  }

  // Load env
  require("dotenv").config({ path: ".env.local" })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Find user
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single()

  if (!user) {
    console.error(`User ${email} not found`)
    process.exit(1)
  }

  if (!user.spreadsheet_id) {
    console.error(`User ${email} has no personal sheet yet. They need to log in first.`)
    process.exit(1)
  }

  console.log(`User: ${email}`)
  console.log(`Personal sheet: ${user.spreadsheet_id}`)
  console.log(`Legacy sheet: ${process.env.SPREADSHEET_ID}`)
  console.log("")
  console.log("To migrate data:")
  console.log("1. Open the legacy sheet in Google Sheets")
  console.log("2. Copy each tab (Pemasukan, Pengeluaran, Tabungan, Budgets, Goals, Utang, Momental, EventBudgets, Tagihan, Settings)")
  console.log("3. Paste into the user's personal sheet (values only to preserve headers)")
  console.log("")
  console.log("Or use the Google Sheets API to copy data programmatically.")
  console.log("The user's personal sheet already has the correct headers for all 10 tabs.")
}

main().catch(console.error)
```

### STEP 11: Environment Variables

Add to `.env.local` (get values from Supabase dashboard → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### STEP 12: Google OAuth Production

The Google OAuth app is currently in "testing" mode. To go production:
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Click "Publish App" → confirm
3. Add `https://www.googleapis.com/auth/drive.file` to the authorized scopes list
4. Add your Vercel domain to "Authorized redirect URIs": `https://your-domain.vercel.app/api/auth/callback/google`

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Next.js 14 App Router** — use `Response.json()`, `"use client"` directives where needed
- Path alias `@/*` → `./src/*`
- Do NOT break existing functionality — the app must still work after this change
- Keep `process.env.SPREADSHEET_ID` as fallback in `getSheetData` for backward compatibility
- Do NOT modify any UI components — this is infrastructure-only
- The `getToken` import should be from `next-auth/jwt` (already set up in Phase 0)
- Preserve all existing lib files (`eventTemplates.js`, `notifications.js`, `report.js`, `forecast.js`, `healthScore.js`, `financialHealthScore.js`, `theme.js`, `parseSheetRow.js`, `useSharedData.js`) — do not delete or rename them

### VERIFICATION

1. **Build check**: `npm run build` succeeds
2. **Login flow**: Log in with Google → check Supabase `users` table → new row created with your email
3. **Sheet creation**: After first login, check Supabase `users` table → `spreadsheet_id` should be populated. Open that URL in browser → should have 10 tabs with headers.
4. **Data isolation**: Log in with a different Google account → should get a DIFFERENT spreadsheet_id → data from user 1 should not appear
5. **Existing functionality**: Create a transaction, budget, goal, debt, event, bill, and setting → each should appear in the user's personal sheet (not the shared one)
6. **All 15 routes work**: Test each API endpoint:
   - `GET /api/dashboard` — returns aggregated data
   - `POST /api/transaction` — creates transaction
   - `PUT /api/transaction/[id]` — updates transaction
   - `DELETE /api/transaction/[id]` — deletes transaction
   - `GET/POST/PUT/DELETE /api/budgets` — budget CRUD
   - `GET/POST/PUT/DELETE /api/goals` — goals CRUD
   - `GET/POST/PUT/DELETE /api/debts` — debts CRUD
   - `GET/POST/PUT/DELETE /api/momental` — events CRUD
   - `GET/PUT/DELETE /api/momental/[id]` — single event
   - `GET /api/momental/summary` — event summary
   - `GET/POST /api/bills` — bills CRUD
   - `PUT/DELETE /api/bills/[id]` — single bill
   - `POST /api/bills/pay` — pay bill
   - `GET /api/bills/summary` — bill summary
   - `GET/PUT /api/settings` — settings CRUD
7. **Migration**: Run `node scripts/migrate-user.js your@email.com` → should print migration instructions

---

## PHASE 2: PAYMENTS + ADMIN DASHBOARD

### CONTEXT

You are working on **Artami Finance Dashboard**. Phase 1 is complete: Supabase is set up with `users`, `payments`, `usage`, `feature_flags`, `admins` tables. Each user gets their own Google Sheet with all 10 tabs. The `getAuthContext(request)` helper returns `{user, accessToken, spreadsheetId, tier}`.

Now we need a payment system so users can upgrade from free to paid tier, and an admin dashboard to review payments.

### YOUR TASK

Build the payment flow and admin dashboard.

### FILES TO READ FIRST

1. `src/lib/apiAuth.js` — Auth context helper (from Phase 1)
2. `src/lib/supabaseAdmin.js` — Supabase admin client (from Phase 1)
3. `src/app/api/auth/[...nextauth]/route.js` — NextAuth config
4. `package.json` — check dependencies
5. `src/app/dashboard/page.js` — Main dashboard (to understand UI patterns)

### FILES TO CREATE

#### 1. `src/lib/adminAuth.js` — Admin authentication helper
```js
import { supabaseAdmin } from "./supabaseAdmin"

export async function isAdmin(email) {
  if (!email) return false
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("email", email)
    .single()
  return !!data
}
```

#### 2. `src/lib/tier.js` — Tier limits and helpers

When defining tier limits, consider ALL features in the current codebase:
- Transactions (income/expense/savings)
- Budgets
- Goals
- Debts
- Momental (event planning)
- Bills (bill reminders)
- Insights (smart spending insights)
- Smart features (healthScore, forecast, anomaly detection)
- PDF reports

```js
export const TIER_LIMITS = {
  free: {
    maxTransactionsPerMonth: 75,
    maxBudgets: 3,
    maxGoals: 1,
    maxDebts: 3,
    maxMomentalEvents: 1,
    maxBills: 3,
    maxInsightsPerWeek: 3,
    smartFeatures: false, // healthScore, forecast, anomaly
    pdfWatermark: true,
  },
  paid: {
    maxTransactionsPerMonth: Infinity,
    maxBudgets: Infinity,
    maxGoals: Infinity,
    maxDebts: Infinity,
    maxMomentalEvents: Infinity,
    maxBills: Infinity,
    maxInsightsPerWeek: Infinity,
    smartFeatures: true,
    pdfWatermark: false,
  },
}

export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free
}

export function isPaid(tier) {
  return tier === "paid"
}
```

#### 3. `src/lib/usage.js` — Usage tracking helper
```js
import { supabaseAdmin } from "./supabaseAdmin"

function getCurrentPeriod(feature) {
  const now = new Date()
  if (feature === "insights") {
    // Weekly period
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`
  }
  // Monthly period
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export async function getUsage(userId, feature) {
  const period = getCurrentPeriod(feature)
  const { data, error } = await supabaseAdmin
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("period", period)
    .single()

  if (error || !data) return 0
  return data.count
}

export async function incrementUsage(userId, feature) {
  const period = getCurrentPeriod(feature)

  // Try to increment existing row
  const { data: existing } = await supabaseAdmin
    .from("usage")
    .select("id, count")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("period", period)
    .single()

  if (existing) {
    await supabaseAdmin
      .from("usage")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id)
    return existing.count + 1
  }

  // Create new row
  const { data: newRow, error } = await supabaseAdmin
    .from("usage")
    .insert({ user_id: userId, feature, count: 1, period })
    .select("count")
    .single()

  if (error) throw new Error(`Failed to track usage: ${error.message}`)
  return newRow.count
}

export async function checkLimit(userId, feature, limit) {
  if (limit === Infinity) return true
  const usage = await getUsage(userId, feature)
  return usage < limit
}
```

#### 4. `src/app/api/payments/route.js` — Payment API for users
```js
import { getAuthContext } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

// GET — list user's own payments
export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id, amount, proof_url, status, created_at, reviewed_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error
    return Response.json({ payments: data })
  } catch (err) {
    console.error("[payments GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

// POST — submit payment proof
export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await request.formData()
    const amount = formData.get("amount")
    const proof = formData.get("proof") // File object

    if (!amount || !proof) {
      return Response.json({ error: "Amount and proof are required" }, { status: 400 })
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Upload proof to Supabase Storage
    const fileName = `${auth.user.id}/${Date.now()}-${proof.name}`
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(fileName, proof, {
        contentType: proof.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error("[payment upload]", uploadErr)
      return Response.json({ error: "Gagal mengupload bukti" }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("payment-proofs")
      .getPublicUrl(fileName)

    // Create payment record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: auth.user.id,
        amount: numAmount,
        proof_url: urlData.publicUrl,
        status: "pending",
      })
      .select()
      .single()

    if (payErr) throw payErr

    return Response.json({ success: true, payment })
  } catch (err) {
    console.error("[payments POST]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
```

#### 5. `src/app/api/admin/payments/route.js` — Admin payment management
```js
import { getAuthContext } from "@/lib/apiAuth"
import { isAdmin } from "@/lib/adminAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

// GET — list pending payments (admin only)
export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await isAdmin(auth.user.email)
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("*, users!inner(email, name)")
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) throw error
    return Response.json({ payments: data })
  } catch (err) {
    console.error("[admin payments GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

// PUT — approve or reject payment
export async function PUT(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await isAdmin(auth.user.email)
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await request.json()
    const { paymentId, action } = body // action: "approve" or "reject"

    if (!paymentId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "paymentId and action (approve/reject) required" }, { status: 400 })
    }

    // Get the payment
    const { data: payment, error: getErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single()

    if (getErr || !payment) {
      return Response.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "pending") {
      return Response.json({ error: "Payment already processed" }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    // Update payment status
    await supabaseAdmin
      .from("payments")
      .update({
        status: newStatus,
        reviewed_by: auth.user.email,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    // If approved, upgrade user tier
    if (action === "approve") {
      await supabaseAdmin
        .from("users")
        .update({ tier: "paid", updated_at: new Date().toISOString() })
        .eq("id", payment.user_id)
    }

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    console.error("[admin payments PUT]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
```

#### 6. `src/app/admin/page.js` — Admin dashboard UI
```js
"use client"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetchPayments()
  }, [status, filter])

  async function fetchPayments() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments?status=${filter}`)
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      setPayments(data.payments || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(paymentId, action) {
    setProcessing(paymentId)
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      // Remove from list
      setPayments(prev => prev.filter(p => p.id !== paymentId))
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Silakan <a href="/api/auth/signin" className="text-blue-600 underline">login</a> untuk mengakses admin.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin — Pembayaran</h1>

        <div className="flex gap-2 mb-6">
          {["pending", "approved", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              {s === "pending" ? "Menunggu" : s === "approved" ? "Disetujui" : "Ditolak"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Tidak ada pembayaran {filter === "pending" ? "yang menunggu" : filter === "approved" ? "yang disetujui" : "yang ditolak"}</div>
        ) : (
          <div className="space-y-4">
            {payments.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.users?.name || p.users?.email}</p>
                    <p className="text-sm text-gray-500">{p.users?.email}</p>
                    <p className="text-lg font-bold mt-1">Rp {Number(p.amount).toLocaleString("id-ID")}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(p.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  {p.proof_url && (
                    <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                      Lihat Bukti
                    </a>
                  )}
                </div>

                {filter === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAction(p.id, "approve")}
                      disabled={processing === p.id}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Setujui
                    </button>
                    <button
                      onClick={() => handleAction(p.id, "reject")}
                      disabled={processing === p.id}
                      className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle size={16} /> Tolak
                    </button>
                  </div>
                )}

                {filter !== "pending" && p.reviewed_at && (
                  <p className="text-xs text-gray-400 mt-3">
                    {filter === "approved" ? "Disetujui" : "Ditolak"} oleh {p.reviewed_by} pada {new Date(p.reviewed_at).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### STEP: Supabase Storage Bucket

In the Supabase dashboard:
1. Go to Storage → Create Bucket
2. Name: `payment-proofs`
3. Public bucket: **Yes** (so admin can view proofs via URL)
4. File size limit: 5MB
5. Allowed MIME types: `image/jpeg, image/png, image/webp`

Or via SQL:
```sql
-- This is typically done via the dashboard, but you can also run:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

### STEP: Seed Admin User

After creating your Supabase tables, add yourself as admin:
```sql
INSERT INTO admins (email) VALUES ('your-email@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Next.js 14 App Router** — `Response.json()`, `"use client"` where needed
- Path alias `@/*` → `./src/*`
- Use `getAuthContext(request)` for all API route auth (from Phase 1)
- Use `supabaseAdmin` for all server-side Supabase operations
- The admin page is a simple functional UI — no need for fancy design, just working
- Payment amount is hardcoded to the product price (you can add a constant like `const PRODUCT_PRICE = 50000`)

### VERIFICATION

1. **Build check**: `npm run build` succeeds
2. **Admin seed**: Run the admin INSERT SQL → check `admins` table has your email
3. **Payment submission**: Log in as a regular user → POST to `/api/payments` with FormData containing `amount` and `proof` (a test image) → check Supabase `payments` table and Storage bucket
4. **Admin view**: Log in as admin → visit `/admin` → should see the pending payment
5. **Approval**: Click "Setujui" → check `payments.status` = "approved" and `users.tier` = "paid"
6. **Rejection**: Submit another payment → click "Tolak" → check status = "rejected", user tier stays "free"
7. **Non-admin access**: Log in as non-admin user → visit `/admin` → API should return 403

---

## PHASE 3: FEATURE GATING

### CONTEXT

You are working on **Artami Finance Dashboard**. Phases 1-2 are complete. The app has:
- Supabase with `users` (tier: free/paid), `usage`, `feature_flags` tables
- `src/lib/tier.js` with `TIER_LIMITS`, `getTierLimits`, `isPaid`
- `src/lib/usage.js` with `getUsage`, `incrementUsage`, `checkLimit`
- Payment flow that upgrades `users.tier` from "free" to "paid"
- **15 API routes** all using `getAuthContext(request)` which returns `{user, accessToken, spreadsheetId, tier}`

Now we need to gate features behind the free/paid tiers.

### YOUR TASK

Implement feature gating across the app.

### FILES TO READ FIRST

1. `src/lib/tier.js` — Tier limits (from Phase 2)
2. `src/lib/usage.js` — Usage tracking (from Phase 2)
3. `src/lib/apiAuth.js` — Auth context helper
4. `src/app/api/transaction/route.js` — Transaction creation (needs gating)
5. `src/app/api/budgets/route.js` — Budget CRUD (needs gating)
6. `src/app/api/goals/route.js` — Goals CRUD (needs gating)
7. `src/app/api/debts/route.js` — Debts CRUD (needs gating)
8. `src/app/api/momental/route.js` — Events CRUD (needs gating)
9. `src/app/api/bills/route.js` — Bills CRUD (needs gating)
10. `src/app/api/dashboard/route.js` — Dashboard data (needs smart feature gating)
11. `src/app/dashboard/page.js` — Main dashboard UI

### FILES TO CREATE

#### 1. `src/lib/featureGate.js` — Feature gate helper
```js
import { getTierLimits } from "./tier"
import { getUsage, checkLimit } from "./usage"

export async function canUseFeature(userId, tier, feature) {
  const limits = getTierLimits(tier)

  switch (feature) {
    case "transaction": {
      const allowed = await checkLimit(userId, "transactions", limits.maxTransactionsPerMonth)
      if (!allowed) {
        const usage = await getUsage(userId, "transactions")
        return {
          allowed: false,
          reason: `Batas transaksi bulanan tercapai (${usage}/${limits.maxTransactionsPerMonth})`,
          upgrade: true,
          current: usage,
          limit: limits.maxTransactionsPerMonth,
        }
      }
      return { allowed: true }
    }

    case "budget": {
      const usage = await getUsage(userId, "budgets_created")
      if (usage >= limits.maxBudgets) {
        return {
          allowed: false,
          reason: `Batas budget tercapai (${usage}/${limits.maxBudgets})`,
          upgrade: true,
          current: usage,
          limit: limits.maxBudgets,
        }
      }
      return { allowed: true }
    }

    case "goal": {
      const usage = await getUsage(userId, "goals_created")
      if (usage >= limits.maxGoals) {
        return {
          allowed: false,
          reason: `Batas tujuan tercapai (${usage}/${limits.maxGoals})`,
          upgrade: true,
          current: usage,
          limit: limits.maxGoals,
        }
      }
      return { allowed: true }
    }

    case "debt": {
      const usage = await getUsage(userId, "debts_created")
      if (usage >= limits.maxDebts) {
        return {
          allowed: false,
          reason: `Batas utang/piutang tercapai (${usage}/${limits.maxDebts})`,
          upgrade: true,
          current: usage,
          limit: limits.maxDebts,
        }
      }
      return { allowed: true }
    }

    case "momental": {
      const usage = await getUsage(userId, "momental_created")
      if (usage >= limits.maxMomentalEvents) {
        return {
          allowed: false,
          reason: `Batas event tercapai (${usage}/${limits.maxMomentalEvents})`,
          upgrade: true,
          current: usage,
          limit: limits.maxMomentalEvents,
        }
      }
      return { allowed: true }
    }

    case "bill": {
      const usage = await getUsage(userId, "bills_created")
      if (usage >= limits.maxBills) {
        return {
          allowed: false,
          reason: `Batas tagihan tercapai (${usage}/${limits.maxBills})`,
          upgrade: true,
          current: usage,
          limit: limits.maxBills,
        }
      }
      return { allowed: true }
    }

    case "insights": {
      const allowed = await checkLimit(userId, "insights", limits.maxInsightsPerWeek)
      if (!allowed) {
        return {
          allowed: false,
          reason: "Batas insight mingguan tercapai",
          upgrade: true,
        }
      }
      return { allowed: true }
    }

    case "smart_features":
      return {
        allowed: limits.smartFeatures,
        reason: limits.smartFeatures ? null : "Fitur pintar tersedia di versi Pro",
        upgrade: !limits.smartFeatures,
      }

    default:
      return { allowed: true }
  }
}

export function getUpgradeReason(feature) {
  const reasons = {
    transaction: "Upgrade ke Pro untuk transaksi tanpa batas",
    budget: "Upgrade ke Pro untuk budget tanpa batas",
    goal: "Upgrade ke Pro untuk tujuan tanpa batas",
    debt: "Upgrade ke Pro untuk utang/piutang tanpa batas",
    momental: "Upgrade ke Pro untuk event budget tanpa batas",
    bill: "Upgrade ke Pro untuk tagihan tanpa batas",
    insights: "Upgrade ke Pro untuk insight tanpa batas",
    smart_features: "Upgrade ke Pro untuk fitur pintar (skor kesehatan, prediksi, anomali)",
  }
  return reasons[feature] || "Upgrade ke Pro untuk fitur ini"
}
```

#### 2. `src/app/api/me/route.js` — User profile + usage endpoint
```js
import { getAuthContext } from "@/lib/apiAuth"
import { getTierLimits } from "@/lib/tier"
import { getUsage } from "@/lib/usage"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const limits = getTierLimits(auth.tier)
    const txUsage = await getUsage(auth.user.id, "transactions")
    const budgetUsage = await getUsage(auth.user.id, "budgets_created")
    const goalUsage = await getUsage(auth.user.id, "goals_created")
    const debtUsage = await getUsage(auth.user.id, "debts_created")
    const momentalUsage = await getUsage(auth.user.id, "momental_created")
    const billUsage = await getUsage(auth.user.id, "bills_created")
    const insightUsage = await getUsage(auth.user.id, "insights")

    return Response.json({
      user: {
        email: auth.user.email,
        name: auth.user.name,
        avatarUrl: auth.user.avatar_url,
        tier: auth.tier,
        createdAt: auth.user.created_at,
      },
      usage: {
        transactions: { current: txUsage, limit: limits.maxTransactionsPerMonth },
        budgets: { current: budgetUsage, limit: limits.maxBudgets },
        goals: { current: goalUsage, limit: limits.maxGoals },
        debts: { current: debtUsage, limit: limits.maxDebts },
        momental: { current: momentalUsage, limit: limits.maxMomentalEvents },
        bills: { current: billUsage, limit: limits.maxBills },
        insights: { current: insightUsage, limit: limits.maxInsightsPerWeek },
      },
      features: {
        smartFeatures: limits.smartFeatures,
        pdfWatermark: limits.pdfWatermark,
      },
    })
  } catch (err) {
    console.error("[me GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
```

#### 3. `src/app/api/me/upgrade/route.js` — Upgrade info endpoint
```js
import { getAuthContext } from "@/lib/apiAuth"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  return Response.json({
    currentTier: auth.tier,
    product: {
      name: "Artami Finance Pro",
      price: 50000,
      currency: "IDR",
      description: "Akses semua fitur tanpa batas",
      features: [
        "Transaksi tanpa batas per bulan",
        "Budget tanpa batas",
        "Tujuan tabungan tanpa batas",
        "Utang/piutang tanpa batas",
        "Event budget tanpa batas",
        "Tagihan tanpa batas",
        "Insight mingguan tanpa batas",
        "Fitur pintar (skor kesehatan, prediksi, anomali)",
        "Laporan PDF tanpa watermark",
      ],
    },
    payment: {
      method: "QRIS",
      instructions: [
        "Scan QRIS yang tersedia",
        "Bayar sesuai harga produk",
        "Upload bukti pembayaran",
        "Tunggu persetujuan admin (biasanya < 24 jam)",
      ],
    },
    isPaid: auth.tier === "paid",
  })
}
```

### FILES TO MODIFY

#### 4. Gate Transaction POST — `src/app/api/transaction/route.js`

Add at the beginning of the POST handler, after auth check:
```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth:
const gate = await canUseFeature(auth.user.id, auth.tier, "transaction")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful transaction creation, before returning success:
await incrementUsage(auth.user.id, "transactions")
```

#### 5. Gate Budget POST — `src/app/api/budgets/route.js`

Add at the beginning of the POST handler, after auth check:
```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth:
const gate = await canUseFeature(auth.user.id, auth.tier, "budget")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful budget creation:
await incrementUsage(auth.user.id, "budgets_created")
```

#### 6. Gate Goal POST — `src/app/api/goals/route.js`

Same pattern as budgets:
```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth:
const gate = await canUseFeature(auth.user.id, auth.tier, "goal")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful goal creation:
await incrementUsage(auth.user.id, "goals_created")
```

#### 7. Gate Debt POST — `src/app/api/debts/route.js`

```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth, BEFORE the action === "pay" check:
const gate = await canUseFeature(auth.user.id, auth.tier, "debt")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful debt creation (not for payment actions):
await incrementUsage(auth.user.id, "debts_created")
```

#### 8. Gate Momental POST — `src/app/api/momental/route.js`

```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth:
const gate = await canUseFeature(auth.user.id, auth.tier, "momental")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful event creation:
await incrementUsage(auth.user.id, "momental_created")
```

#### 9. Gate Bills POST — `src/app/api/bills/route.js`

```js
import { canUseFeature } from "@/lib/featureGate"
import { incrementUsage } from "@/lib/usage"

// Inside POST handler, after getting auth:
const gate = await canUseFeature(auth.user.id, auth.tier, "bill")
if (!gate.allowed) {
  return Response.json(
    { error: gate.reason, upgrade: true, current: gate.current, limit: gate.limit },
    { status: 403 }
  )
}

// After successful bill creation:
await incrementUsage(auth.user.id, "bills_created")
```

#### 10. Gate Smart Features in Dashboard — `src/app/api/dashboard/route.js`

Add at the end of the dashboard response, before `return Response.json(...)`:
```js
import { getTierLimits } from "@/lib/tier"

// After computing all data, before returning:
const limits = getTierLimits(auth.tier)

// Conditionally include smart features
const healthScore = limits.smartFeatures ? computeHealthScore(/* pass data */) : null
const forecast = limits.smartFeatures ? computeForecast(/* pass data */) : null
const anomaly = limits.smartFeatures ? detectAnomalies(/* pass data */) : null

// Add to response:
return Response.json({
  // ... existing fields ...
  healthScore,
  forecast,
  anomaly,
  tier: auth.tier,
})
```

Note: If `computeHealthScore`, `computeForecast`, `detectAnomalies` don't exist yet, just set them to `null` and add a TODO comment. The gate itself is what matters. The app already has `src/lib/healthScore.js`, `src/lib/financialHealthScore.js`, and `src/lib/forecast.js` — use those if they export usable functions.

#### 11. Gate Insights — track usage when insights are fetched

In the dashboard route, after generating insights:
```js
import { incrementUsage } from "@/lib/usage"
import { canUseFeature } from "@/lib/featureGate"

// Before generating insights:
const insightsGate = await canUseFeature(auth.user.id, auth.tier, "insights")
let insights = null
if (insightsGate.allowed) {
  insights = generateInsights(/* pass data */)
  await incrementUsage(auth.user.id, "insights")
} else {
  insights = [{ message: "Upgrade ke Pro untuk melihat lebih banyak insight", upgrade: true }]
}
```

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Next.js 14 App Router** — `Response.json()`, `"use client"` where needed
- Path alias `@/*` → `./src/*`
- Use `getAuthContext(request)` for all API route auth
- 403 responses must include `{error, upgrade: true}` so the client can show an upgrade prompt
- Do NOT break existing paid-tier behavior — paid users should see no change
- Track usage AFTER successful creation, not before (don't count failed attempts)
- Do NOT modify or delete existing lib files (`healthScore.js`, `forecast.js`, etc.) — only import from them

### VERIFICATION

1. **Build check**: `npm run build` succeeds
2. **Free tier limits**:
   - Create 75 transactions → 76th should return 403 with upgrade flag
   - Create 3 budgets → 4th should return 403
   - Create 1 goal → 2nd should return 403
   - Create 3 debts → 4th should return 403
   - Create 1 event → 2nd should return 403
   - Create 3 bills → 4th should return 403
3. **Paid tier unlimited**: Set `users.tier = 'paid'` in Supabase → all limits should be bypassed
4. **Smart features**: Dashboard response for free user should have `healthScore: null, forecast: null, anomaly: null`. Paid user should get actual values (or nulls if not implemented yet).
5. **`/api/me`**: Returns user profile with current usage counts and limits for all 7 features
6. **`/api/me/upgrade`**: Returns product info, QRIS details, and `isPaid: false` for free users

---

## PHASE 4: POLISH + SECURITY HARDENING

### CONTEXT

You are working on **Artami Finance Dashboard**. Phases 1-3 are complete. The app has multi-tenancy, payments, feature gating. Now we need production hardening: rate limiting, input validation, standardized errors, health checks, and cleanup.

### YOUR TASK

Add production hardening across the app.

### FILES TO READ FIRST

1. All 15 API routes in `src/app/api/`
2. `next.config.js`
3. `package.json`
4. `src/lib/` — all lib files

### FILES TO CREATE

#### 1. `src/lib/rateLimit.js` — In-memory rate limiter
```js
// Simple in-memory rate limiter (Map-based)
// For production at scale, replace with Redis-based limiter

const rateLimitMap = new Map()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap) {
    if (now - value.start > 60000) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function rateLimit({ key, limit = 60, windowMs = 60000 }) {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now - record.start > windowMs) {
    rateLimitMap.set(key, { start: now, count: 1 })
    return { success: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((record.start + windowMs - now) / 1000),
    }
  }

  record.count++
  return { success: true, remaining: limit - record.count }
}

export function getRateLimitKey(request, userId) {
  // Use userId if available, otherwise fall back to IP
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  return `ip:${ip}`
}
```

#### 2. `src/lib/validate.js` — Zod-like input validation (no extra deps)
```js
// Lightweight validation without adding Zod dependency
// Validates common input patterns for the finance app

export function validateTransaction(body) {
  const errors = []

  if (!body.tanggal || typeof body.tanggal !== "string") {
    errors.push("Tanggal wajib diisi")
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal)) {
    errors.push("Format tanggal harus YYYY-MM-DD")
  }

  if (!body.kategori || typeof body.kategori !== "string") {
    errors.push("Kategori wajib diisi")
  } else if (body.kategori.length > 100) {
    errors.push("Kategori maksimal 100 karakter")
  }

  if (body.jumlah === undefined || body.jumlah === null || body.jumlah === "") {
    errors.push("Jumlah wajib diisi")
  } else {
    const amount = parseFloat(String(body.jumlah).replace(/[^0-9.]/g, ""))
    if (isNaN(amount) || amount <= 0) {
      errors.push("Jumlah harus lebih dari 0")
    } else if (amount > 999999999999) {
      errors.push("Jumlah terlalu besar")
    }
  }

  if (body.keterangan && typeof body.keterangan === "string" && body.keterangan.length > 500) {
    errors.push("Keterangan maksimal 500 karakter")
  }

  if (body.catatan && typeof body.catatan === "string" && body.catatan.length > 1000) {
    errors.push("Catatan maksimal 1000 karakter")
  }

  if (body.akunBank && typeof body.akunBank === "string" && body.akunBank.length > 100) {
    errors.push("Akun bank maksimal 100 karakter")
  }

  const validTypes = ["income", "expense", "savings"]
  if (body.type && !validTypes.includes(body.type)) {
    errors.push("Tipe transaksi tidak valid")
  }

  return errors
}

export function validateBudget(body) {
  const errors = []

  if (!body.kategori || typeof body.kategori !== "string") {
    errors.push("Kategori wajib diisi")
  } else if (body.kategori.length > 100) {
    errors.push("Kategori maksimal 100 karakter")
  }

  if (!body.bulan || typeof body.bulan !== "string") {
    errors.push("Bulan wajib diisi")
  }

  if (!body.tahun && body.tahun !== 0) {
    errors.push("Tahun wajib diisi")
  }

  if (body.limit === undefined || body.limit === null) {
    errors.push("Limit wajib diisi")
  } else {
    const limit = parseFloat(body.limit)
    if (isNaN(limit) || limit <= 0) {
      errors.push("Limit harus lebih dari 0")
    } else if (limit > 999999999999) {
      errors.push("Limit terlalu besar")
    }
  }

  return errors
}

export function validateGoal(body) {
  const errors = []

  if (!body.nama || typeof body.nama !== "string") {
    errors.push("Nama wajib diisi")
  } else if (body.nama.length > 200) {
    errors.push("Nama maksimal 200 karakter")
  }

  if (!body.target && body.target !== 0) {
    errors.push("Target wajib diisi")
  } else {
    const target = parseFloat(body.target)
    if (isNaN(target) || target <= 0) {
      errors.push("Target harus lebih dari 0")
    } else if (target > 999999999999) {
      errors.push("Target terlalu besar")
    }
  }

  if (!body.deadline || typeof body.deadline !== "string") {
    errors.push("Deadline wajib diisi")
  }

  if (!body.kategori || typeof body.kategori !== "string") {
    errors.push("Kategori wajib diisi")
  } else if (body.kategori.length > 100) {
    errors.push("Kategori maksimal 100 karakter")
  }

  return errors
}

export function validateDebt(body) {
  const errors = []
  if (!body.namaOrang || typeof body.namaOrang !== "string") {
    errors.push("Nama orang wajib diisi")
  } else if (body.namaOrang.length > 200) {
    errors.push("Nama orang maksimal 200 karakter")
  }
  if (!body.jumlah || isNaN(parseFloat(body.jumlah))) {
    errors.push("Jumlah harus berupa angka")
  } else {
    const amt = parseFloat(body.jumlah)
    if (amt <= 0) errors.push("Jumlah harus lebih dari 0")
    else if (amt > 999999999999) errors.push("Jumlah terlalu besar")
  }
  if (!body.arah || !["utang", "piutang"].includes(body.arah)) {
    errors.push("Arah harus 'utang' atau 'piutang'")
  }
  if (!body.jatuhTempo) {
    errors.push("Jatuh tempo wajib diisi")
  }
  return errors
}

export function validateEvent(body) {
  const errors = []
  if (!body.nama || typeof body.nama !== "string") {
    errors.push("Nama event wajib diisi")
  } else if (body.nama.length > 200) {
    errors.push("Nama event maksimal 200 karakter")
  }
  if (!body.tanggalMulai) errors.push("Tanggal mulai wajib diisi")
  if (!body.tanggalSelesai) errors.push("Tanggal selesai wajib diisi")
  if (!body.totalBudget || isNaN(parseFloat(body.totalBudget))) {
    errors.push("Total budget harus berupa angka")
  } else {
    const amt = parseFloat(body.totalBudget)
    if (amt <= 0) errors.push("Total budget harus lebih dari 0")
    else if (amt > 999999999999) errors.push("Total budget terlalu besar")
  }
  return errors
}

export function validateBill(body) {
  const errors = []
  if (!body.nama || typeof body.nama !== "string") {
    errors.push("Nama tagihan wajib diisi")
  } else if (body.nama.length > 200) {
    errors.push("Nama tagihan maksimal 200 karakter")
  }
  if (!body.jumlah || isNaN(parseFloat(body.jumlah))) {
    errors.push("Jumlah harus berupa angka")
  } else {
    const amt = parseFloat(body.jumlah)
    if (amt <= 0) errors.push("Jumlah harus lebih dari 0")
    else if (amt > 999999999999) errors.push("Jumlah terlalu besar")
  }
  if (!body.tipe || !["expense", "income"].includes(body.tipe)) {
    errors.push("Tipe harus 'expense' atau 'income'")
  }
  if (!body.kategoriBill) errors.push("Kategori bill wajib diisi")
  if (!body.kategoriTransaksi) errors.push("Kategori transaksi wajib diisi")
  if (!body.frekuensi) errors.push("Frekuensi wajib diisi")
  if (!body.tanggalJatuhTempo || isNaN(parseInt(body.tanggalJatuhTempo))) {
    errors.push("Tanggal jatuh tempo harus berupa angka")
  }
  return errors
}

export function validateSetting(body) {
  const errors = []
  if (body.updates) {
    if (!Array.isArray(body.updates)) {
      errors.push("updates harus berupa array")
    }
  } else if (!body.key) {
    errors.push("key wajib diisi")
  }
  return errors
}

export function errorResponse(message, status = 400, extra = {}) {
  return Response.json({ error: true, message, ...extra }, { status })
}

export function successResponse(data, message = "OK") {
  return Response.json({ error: false, message, data })
}
```

#### 3. `src/app/api/health/route.js` — Health check endpoint
```js
export const dynamic = "force-dynamic"

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    env: {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      google: !!process.env.GOOGLE_CLIENT_ID,
      nextauth: !!process.env.NEXTAUTH_SECRET,
    },
  }

  // Check if critical env vars are set
  const missingEnv = Object.entries(checks.env)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missingEnv.length > 0) {
    checks.status = "degraded"
    checks.missingEnv = missingEnv
  }

  return Response.json(checks, { status: checks.status === "ok" ? 200 : 503 })
}
```

#### 4. `src/lib/logger.js` — Structured logging
```js
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLevel = process.env.LOG_LEVEL || "info"

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const logger = {
  debug(message, meta = {}) {
    if (!shouldLog("debug")) return
    console.debug(JSON.stringify({ level: "debug", message, ...meta, timestamp: new Date().toISOString() }))
  },

  info(message, meta = {}) {
    if (!shouldLog("info")) return
    console.log(JSON.stringify({ level: "info", message, ...meta, timestamp: new Date().toISOString() }))
  },

  warn(message, meta = {}) {
    if (!shouldLog("warn")) return
    console.warn(JSON.stringify({ level: "warn", message, ...meta, timestamp: new Date().toISOString() }))
  },

  error(message, meta = {}) {
    if (!shouldLog("error")) return
    console.error(JSON.stringify({ level: "error", message, ...meta, timestamp: new Date().toISOString() }))
  },
}
```

### FILES TO MODIFY

#### 5. Add rate limiting to ALL 15 API routes

In each API route handler, add rate limiting at the top:

```js
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit"

// At the start of each handler:
const auth = await getAuthContext(request)
const rlKey = getRateLimitKey(request, auth?.user?.id)
const rl = rateLimit({ key: rlKey, limit: 60 })
if (!rl.success) {
  return Response.json(
    { error: true, message: "Terlalu banyak permintaan. Coba lagi nanti." },
    {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    }
  )
}
```

Apply to all handlers in:
- `src/app/api/dashboard/route.js`
- `src/app/api/transaction/route.js`
- `src/app/api/transaction/[id]/route.js`
- `src/app/api/budgets/route.js`
- `src/app/api/goals/route.js`
- `src/app/api/debts/route.js`
- `src/app/api/momental/route.js`
- `src/app/api/momental/[id]/route.js`
- `src/app/api/momental/summary/route.js`
- `src/app/api/bills/route.js`
- `src/app/api/bills/[id]/route.js`
- `src/app/api/bills/pay/route.js`
- `src/app/api/bills/summary/route.js`
- `src/app/api/settings/route.js`
- `src/app/api/payments/route.js` (from Phase 2)
- `src/app/api/admin/payments/route.js` (from Phase 2)
- `src/app/api/me/route.js` (from Phase 3)
- `src/app/api/me/upgrade/route.js` (from Phase 3)

#### 6. Update all mutation endpoints to use standardized validation

Replace inline validation in each route with the validators from `src/lib/validate.js`:

```js
import { validateTransaction, errorResponse } from "@/lib/validate"

// In POST handler:
const errors = validateTransaction(body)
if (errors.length) {
  return errorResponse(errors.join("; "))
}
```

Apply to:
- `src/app/api/transaction/route.js` → `validateTransaction`
- `src/app/api/budgets/route.js` → `validateBudget`
- `src/app/api/goals/route.js` → `validateGoal`
- `src/app/api/debts/route.js` → `validateDebt`
- `src/app/api/momental/route.js` → `validateEvent`
- `src/app/api/bills/route.js` → `validateBill`
- `src/app/api/settings/route.js` → `validateSetting`

#### 7. Add security headers middleware — `src/middleware.js`

Create a middleware file for request-level security:
```js
import { NextResponse } from "next/server"

export function middleware(request) {
  const response = NextResponse.next()

  // Security headers (redundant with next.config.js headers, but middleware runs first)
  response.headers.set("X-DNS-Prefetch-Control", "on")
  response.headers.set("X-Request-Id", crypto.randomUUID())

  return response
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match dashboard routes
    "/dashboard/:path*",
    "/admin/:path*",
  ],
}
```

#### 8. Environment variable validation — `src/lib/env.js`
```js
// Call this at app startup (in next.config.js or a top-level layout)
const REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

export function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`)
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    }
  }
}
```

Call `validateEnv()` in `next.config.js`:
```js
const { validateEnv } = require("./src/lib/env")
validateEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
}
module.exports = nextConfig
```

#### 9. Check feature flags before serving features

In `src/lib/featureGate.js`, add a feature flag check:
```js
import { supabaseAdmin } from "./supabaseAdmin"

let flagCache = null
let flagCacheTime = 0
const FLAG_CACHE_TTL = 60000 // 1 minute

export async function isFeatureEnabled(key) {
  const now = Date.now()
  if (flagCache && now - flagCacheTime < FLAG_CACHE_TTL) {
    return flagCache[key] ?? false
  }

  const { data } = await supabaseAdmin
    .from("feature_flags")
    .select("key, enabled")

  flagCache = {}
  for (const flag of (data || [])) {
    flagCache[flag.key] = flag.enabled
  }
  flagCacheTime = now

  return flagCache[key] ?? false
}
```

#### 10. Remove unused `googleapis` package

The `googleapis` package is in `package.json` but the app uses direct fetch calls to the Sheets API. Remove it:

```bash
npm uninstall googleapis
```

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Next.js 14 App Router**
- Path alias `@/*` → `./src/*`
- Do NOT add heavy dependencies (no Zod, no Redis, no Winston) — keep it lightweight
- Rate limiter is in-memory (fine for single-instance Vercel deployment)
- The `validateEnv` check should only `process.exit(1)` in production, not dev
- Preserve all existing functionality

### VERIFICATION

1. **Build check**: `npm run build` succeeds
2. **Health check**: `GET /api/health` returns `{status: "ok", env: {...}}`
3. **Rate limiting**: Send 61 rapid requests to `/api/dashboard` → 61st should return 429
4. **Input validation**: POST to `/api/transaction` with `{jumlah: -100}` → 400 with clear error message
5. **Standardized errors**: All error responses follow `{error: true, message: "..."}` format
6. **Security headers**: `curl -I /api/health` includes X-Request-Id header
7. **Feature flags**: Toggle a flag in Supabase → verify the feature is gated/ungated
8. **googleapis removed**: `npm ls googleapis` shows nothing

---

## PHASE 5: TESTING + VERIFICATION

### CONTEXT

You are working on **Artami Finance Dashboard**. All phases 0-4 are complete. The app has:
- Security fixes (Phase 0)
- Supabase multi-tenancy (Phase 1)
- Payments + admin (Phase 2)
- Feature gating (Phase 3)
- Production hardening (Phase 4)

Now we need tests to verify everything works correctly.

### YOUR TASK

Write tests and run verification checks. The project uses **Vitest** (already in devDependencies).

### FILES TO READ FIRST

1. `package.json` — check test scripts and dependencies
2. All files created/modified in Phases 0-4

### FILES TO CREATE

#### 1. `__tests__/api/transaction.test.js` — Transaction CRUD tests
```js
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock getAuthContext
vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

// Mock sheets
vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(() => Promise.resolve([])),
}))

// Mock feature gate
vi.mock("@/lib/featureGate", () => ({
  canUseFeature: vi.fn(() => Promise.resolve({ allowed: true })),
}))

// Mock usage
vi.mock("@/lib/usage", () => ({
  incrementUsage: vi.fn(() => Promise.resolve(1)),
}))

// Mock rate limit
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 59 })),
  getRateLimitKey: vi.fn(() => "user:test"),
}))

import { getAuthContext } from "@/lib/apiAuth"
import { canUseFeature } from "@/lib/featureGate"
import { rateLimit } from "@/lib/rateLimit"

function makeRequest(body, method = "POST") {
  return {
    json: () => Promise.resolve(body),
    method,
    headers: new Map(),
  }
}

describe("Transaction API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      accessToken: "mock-token",
      spreadsheetId: "mock-sheet-id",
      tier: "free",
    })
  })

  describe("Input Validation", () => {
    it("rejects missing tanggal", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ kategori: "Makan", jumlah: 50000 })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
      expect(data.message || data.error).toContain("Tanggal")
    })

    it("rejects missing kategori", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", jumlah: 50000 })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
      expect(data.message || data.error).toContain("Kategori")
    })

    it("rejects negative amount", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: -500 })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
    })

    it("rejects amount over 999999999999", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 9999999999999 })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
    })

    it("rejects invalid type", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 50000, type: "invalid" })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
    })

    it("rejects keterangan over 500 chars", async () => {
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({
        tanggal: "2026-01-15",
        kategori: "Makan",
        jumlah: 50000,
        keterangan: "x".repeat(501),
      })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
    })
  })

  describe("Rate Limiting", () => {
    it("returns 429 when rate limit exceeded", async () => {
      rateLimit.mockReturnValue({ success: false, remaining: 0, retryAfter: 30 })
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 50000 })
      const res = await POST(req)
      expect(res.status).toBe(429)
    })
  })

  describe("Feature Gating", () => {
    it("returns 403 when transaction limit reached", async () => {
      canUseFeature.mockResolvedValue({
        allowed: false,
        reason: "Batas transaksi bulanan tercapai",
        upgrade: true,
        current: 75,
        limit: 75,
      })
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 50000 })
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(403)
      expect(data.upgrade).toBe(true)
    })
  })

  describe("Auth", () => {
    it("returns 401 when not authenticated", async () => {
      getAuthContext.mockResolvedValue(null)
      const { POST } = await import("@/app/api/transaction/route")
      const req = makeRequest({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 50000 })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })
  })
})
```

#### 2. `__tests__/api/data-isolation.test.js` — Data isolation tests
```js
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/apiAuth")
vi.mock("@/lib/sheets")
vi.mock("@/lib/featureGate")
vi.mock("@/lib/usage")
vi.mock("@/lib/rateLimit")

import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"

function makeRequest() {
  return { headers: new Map() }
}

describe("Data Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock rate limit to always pass
    const { rateLimit, getRateLimitKey } = require("@/lib/rateLimit")
    rateLimit.mockReturnValue({ success: true, remaining: 59 })
    getRateLimitKey.mockReturnValue("user:test")
  })

  it("User A's dashboard only returns User A's data", async () => {
    // Set up User A context
    getAuthContext.mockResolvedValue({
      user: { id: "user-a", email: "a@test.com" },
      accessToken: "token-a",
      spreadsheetId: "sheet-a",
      tier: "free",
    })

    // Mock getSheetData to return different data based on spreadsheetId
    getSheetData.mockImplementation((token, range, sid) => {
      if (sid === "sheet-a") {
        return Promise.resolve([
          ["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2"],
          ["15 Jan 2026", "tx-1", "Gaji", "Monthly Salary", 5000000, "", "", "Bank BCA", 5000000, "", "Jan", 2026, 2026],
        ])
      }
      return Promise.resolve([])
    })

    const { GET } = await import("@/app/api/dashboard/route")
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalIncome).toBe(5000000)
  })

  it("User B's dashboard only returns User B's data", async () => {
    getAuthContext.mockResolvedValue({
      user: { id: "user-b", email: "b@test.com" },
      accessToken: "token-b",
      spreadsheetId: "sheet-b",
      tier: "free",
    })

    getSheetData.mockImplementation((token, range, sid) => {
      if (sid === "sheet-b") {
        return Promise.resolve([
          ["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2"],
          ["15 Jan 2026", "tx-2", "Belanja", "Belanja", 200000, "", "", "Cash", 200000, "", "Jan", 2026, 2026],
        ])
      }
      return Promise.resolve([])
    })

    const { GET } = await import("@/app/api/dashboard/route")
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalExpense).toBe(200000)
    // Should NOT contain User A's data
    expect(data.transactions.find(t => t.id === "tx-1")).toBeUndefined()
  })

  it("Different users get different spreadsheetIds", async () => {
    const authA = await getAuthContext(/* request A */)
    const authB = await getAuthContext(/* request B */)

    // Verify they use different sheets
    expect(authA.spreadsheetId).not.toBe(authB.spreadsheetId)
  })
})
```

#### 3. `__tests__/api/rate-limit.test.js` — Rate limiter unit tests
```js
import { describe, it, expect, beforeEach } from "vitest"
import { rateLimit } from "@/lib/rateLimit"

describe("Rate Limiter", () => {
  it("allows requests within limit", () => {
    const result = rateLimit({ key: "test-1", limit: 5, windowMs: 60000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks requests over limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit({ key: "test-2", limit: 5, windowMs: 60000 })
    }
    const result = rateLimit({ key: "test-2", limit: 5, windowMs: 60000 })
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it("tracks different keys independently", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: "test-3a", limit: 5, windowMs: 60000 })
    }
    const result = rateLimit({ key: "test-3b", limit: 5, windowMs: 60000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("resets after window expires", async () => {
    rateLimit({ key: "test-4", limit: 1, windowMs: 50 })
    const blocked = rateLimit({ key: "test-4", limit: 1, windowMs: 50 })
    expect(blocked.success).toBe(false)

    await new Promise(r => setTimeout(r, 60))
    const allowed = rateLimit({ key: "test-4", limit: 1, windowMs: 50 })
    expect(allowed.success).toBe(true)
  })
})
```

#### 4. `__tests__/api/validation.test.js` — Input validation unit tests
```js
import { describe, it, expect } from "vitest"
import { validateTransaction, validateBudget, validateGoal, validateDebt, validateEvent, validateBill } from "@/lib/validate"

describe("validateTransaction", () => {
  it("accepts valid transaction", () => {
    const errors = validateTransaction({
      tanggal: "2026-01-15",
      kategori: "Makan",
      jumlah: 50000,
      type: "expense",
    })
    expect(errors).toHaveLength(0)
  })

  it("rejects missing tanggal", () => {
    const errors = validateTransaction({ kategori: "Makan", jumlah: 50000 })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("Tanggal")
  })

  it("rejects bad date format", () => {
    const errors = validateTransaction({ tanggal: "15-01-2026", kategori: "Makan", jumlah: 50000 })
    expect(errors.some(e => e.includes("YYYY-MM-DD"))).toBe(true)
  })

  it("rejects negative amount", () => {
    const errors = validateTransaction({ tanggal: "2026-01-15", kategori: "Makan", jumlah: -100 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejects amount over max", () => {
    const errors = validateTransaction({ tanggal: "2026-01-15", kategori: "Makan", jumlah: 9999999999999 })
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejects long keterangan", () => {
    const errors = validateTransaction({
      tanggal: "2026-01-15",
      kategori: "Makan",
      jumlah: 50000,
      keterangan: "x".repeat(501),
    })
    expect(errors.some(e => e.includes("500"))).toBe(true)
  })
})

describe("validateBudget", () => {
  it("accepts valid budget", () => {
    const errors = validateBudget({ kategori: "Makan", bulan: "Jan", tahun: 2026, limit: 1000000 })
    expect(errors).toHaveLength(0)
  })

  it("rejects missing fields", () => {
    const errors = validateBudget({})
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejects zero limit", () => {
    const errors = validateBudget({ kategori: "Makan", bulan: "Jan", tahun: 2026, limit: 0 })
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe("validateGoal", () => {
  it("accepts valid goal", () => {
    const errors = validateGoal({
      nama: "Liburan",
      target: 5000000,
      deadline: "2026-12-31",
      kategori: "Tabungan Cash",
    })
    expect(errors).toHaveLength(0)
  })

  it("rejects missing nama", () => {
    const errors = validateGoal({ target: 5000000, deadline: "2026-12-31", kategori: "Tabungan Cash" })
    expect(errors.some(e => e.includes("Nama"))).toBe(true)
  })
})

describe("validateDebt", () => {
  it("accepts valid debt", () => {
    const errors = validateDebt({
      namaOrang: "Budi",
      jumlah: 1000000,
      arah: "utang",
      jatuhTempo: "2026-06-30",
    })
    expect(errors).toHaveLength(0)
  })

  it("rejects invalid arah", () => {
    const errors = validateDebt({
      namaOrang: "Budi",
      jumlah: 1000000,
      arah: "invalid",
      jatuhTempo: "2026-06-30",
    })
    expect(errors.some(e => e.includes("utang") || e.includes("piutang"))).toBe(true)
  })
})

describe("validateEvent", () => {
  it("accepts valid event", () => {
    const errors = validateEvent({
      nama: "Lebaran",
      tanggalMulai: "2026-03-01",
      tanggalSelesai: "2026-04-01",
      totalBudget: 5000000,
    })
    expect(errors).toHaveLength(0)
  })

  it("rejects missing tanggalMulai", () => {
    const errors = validateEvent({
      nama: "Lebaran",
      tanggalSelesai: "2026-04-01",
      totalBudget: 5000000,
    })
    expect(errors.some(e => e.includes("mulai"))).toBe(true)
  })
})

describe("validateBill", () => {
  it("accepts valid bill", () => {
    const errors = validateBill({
      nama: "Listrik",
      jumlah: 500000,
      tipe: "expense",
      kategoriBill: "Listrik",
      kategoriTransaksi: "Utilitas",
      frekuensi: "monthly",
      tanggalJatuhTempo: 15,
    })
    expect(errors).toHaveLength(0)
  })

  it("rejects invalid tipe", () => {
    const errors = validateBill({
      nama: "Listrik",
      jumlah: 500000,
      tipe: "invalid",
      kategoriBill: "Listrik",
      kategoriTransaksi: "Utilitas",
      frekuensi: "monthly",
      tanggalJatuhTempo: 15,
    })
    expect(errors.some(e => e.includes("expense") || e.includes("income"))).toBe(true)
  })
})
```

#### 5. `__tests__/api/security-headers.test.js` — Security headers verification
```js
import { describe, it, expect } from "vitest"
import nextConfig from "../../next.config"

describe("Security Headers", () => {
  it("next.config.js has headers function", () => {
    expect(typeof nextConfig.headers).toBe("function")
  })

  it("returns security headers for all routes", async () => {
    const headers = await nextConfig.headers()
    expect(headers).toBeDefined()
    expect(headers.length).toBeGreaterThan(0)

    const allHeaders = headers[0].headers
    const headerMap = {}
    for (const h of allHeaders) {
      headerMap[h.key] = h.value
    }

    expect(headerMap["X-Frame-Options"]).toBe("DENY")
    expect(headerMap["X-Content-Type-Options"]).toBe("nosniff")
    expect(headerMap["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(headerMap["Strict-Transport-Security"]).toContain("max-age")
    expect(headerMap["Permissions-Policy"]).toBeDefined()
  })

  it("applies to all routes via catch-all pattern", () => {
    const source = headers()[0].source
    expect(source).toBe("/(.*)")
  })
})
```

#### 6. `__tests__/api/feature-gate.test.js` — Feature gate unit tests
```js
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { count: 1 }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}))

import { canUseFeature, getUpgradeReason } from "@/lib/featureGate"

describe("canUseFeature", () => {
  it("allows transaction for paid user", async () => {
    const result = await canUseFeature("user-1", "paid", "transaction")
    expect(result.allowed).toBe(true)
  })

  it("allows smart_features for paid user", async () => {
    const result = await canUseFeature("user-1", "paid", "smart_features")
    expect(result.allowed).toBe(true)
  })

  it("blocks smart_features for free user", async () => {
    const result = await canUseFeature("user-1", "free", "smart_features")
    expect(result.allowed).toBe(false)
    expect(result.upgrade).toBe(true)
  })

  it("returns upgrade flag on block", async () => {
    const result = await canUseFeature("user-1", "free", "smart_features")
    expect(result.upgrade).toBe(true)
  })
})

describe("getUpgradeReason", () => {
  it("returns reason for transaction", () => {
    const reason = getUpgradeReason("transaction")
    expect(reason).toContain("transaksi")
  })

  it("returns reason for momental", () => {
    const reason = getUpgradeReason("momental")
    expect(reason).toContain("event")
  })

  it("returns reason for bill", () => {
    const reason = getUpgradeReason("bill")
    expect(reason).toContain("tagihan")
  })

  it("returns generic reason for unknown feature", () => {
    const reason = getUpgradeReason("unknown_feature")
    expect(reason).toBeTruthy()
  })
})
```

#### 7. `vitest.config.js` — Vitest configuration (if not already present)
```js
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

### VERIFICATION CHECKLIST

Run through this checklist manually to verify the entire commercialization works:

```bash
# 1. Build passes
npm run build

# 2. All tests pass
npm run test

# 3. Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","env":{"supabase":true,"google":true,"nextauth":true}}

# 4. Security headers
curl -I http://localhost:3000
# Expected: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, etc.

# 5. Rate limiting (send 61 rapid requests)
for i in $(seq 1 61); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health; done
# Expected: last one returns 429

# 6. Auth check (via browser)
# Login → check /api/auth/session → should NOT contain accessToken
# Check Supabase users table → new row with your email
# Check users.spreadsheet_id → populated with a Google Sheet URL

# 7. Transaction creation
# Create a transaction via the UI → check it appears in the user's personal sheet (not shared sheet)

# 8. Feature gating (free tier)
# Create 75 transactions → 76th should fail with 403 + upgrade flag
# Create 3 budgets → 4th should fail
# Create 1 goal → 2nd should fail
# Create 3 debts → 4th should fail
# Create 1 event → 2nd should fail
# Create 3 bills → 4th should fail

# 9. Payment flow
# Upload payment proof → check Supabase payments table + storage bucket
# As admin, approve payment → check user.tier changes to "paid"

# 10. Data isolation
# Login with two different Google accounts
# Each should see only their own data
# Each should have a different spreadsheet_id

# 11. All API routes respond correctly
# GET /api/dashboard — aggregated data
# GET /api/bills — bill list
# GET /api/bills/summary — bill summary
# POST /api/bills/pay — pay a bill
# GET /api/momental — event list
# GET /api/momental/summary — event summary
# GET /api/settings — user settings
# GET /api/me — user profile + usage
# GET /api/me/upgrade — upgrade info

# 12. Error messages
# Break something temporarily (invalid SPREADSHEET_ID)
# Check that error response says "Terjadi kesalahan internal", NOT the raw API error
```

### CONSTRAINTS

- **JavaScript only** — no TypeScript
- **Vitest** is already in devDependencies — use it
- Tests should be runnable with `npm run test`
- Mock external dependencies (Google Sheets API, Supabase) — don't make real API calls in tests
- Tests should be deterministic — no random data, no time-dependent failures
- Keep tests fast — each test file should complete in < 5 seconds

### FINAL NOTES

After completing all 6 phases:

1. **Update AGENTS.md** — add the new files and architecture decisions
2. **Update `.env.local`** — ensure all required env vars are documented
3. **Deploy to Vercel** — add all env vars in Vercel dashboard
4. **Test on production** — run through the verification checklist on the deployed URL
5. **Monitor** — check Vercel function logs for any errors in the first 24 hours

The `SPREADSHEET_ID` env var is now only used as a fallback in `getSheetData` for backward compatibility. All new data goes to per-user sheets. Existing users will need to log in once to get their personal sheet created (with all 10 tabs), then you can migrate their data using the migration script.

**Google Sheets tabs created per user** (10 total):
| Tab | Columns | Purpose |
|-----|---------|---------|
| Pemasukan | A-M (13) | Income transactions |
| Pengeluaran | A-M (13) | Expense transactions |
| Tabungan | A-M (13) | Savings transactions |
| Budgets | A-F (6) | Per-category monthly limits |
| Goals | A-H (8) | Savings goals |
| Utang | A-I (9) | Debts and receivables |
| Momental | A-K (11) | Event/milestone budgets |
| EventBudgets | A-F (6) | Event sub-category budgets |
| Tagihan | A-M (13) | Bill reminders |
| Settings | A-B (2) | User settings (key-value) |
