-- =============================================================================
-- Artami Finance Dashboard - Seed Data
-- Run this file after 004-views.sql
-- =============================================================================

-- =============================================================================
-- FEATURE FLAGS
-- =============================================================================
-- Insert default feature flags for gradual rollout
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('budgets_enabled', true, 'Budget tracking feature'),
  ('goals_enabled', true, 'Savings goals feature'),
  ('momental_enabled', true, 'Event/milestone budget planning'),
  ('bills_enabled', true, 'Bill reminders and auto-pay'),
  ('smart_insights', true, 'AI-powered spending insights'),
  ('pdf_reports', true, 'PDF report generation'),
  ('health_score', true, 'Financial health score'),
  ('forecast', true, 'Cash flow forecasting'),
  ('multi_tenancy', true, 'Multi-tenancy with per-user sheets'),
  ('payment_qris', true, 'QRIS payment for tier upgrade')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- ADMIN USERS
-- =============================================================================
-- Add your admin email here (replace with your actual email)
-- INSERT INTO admins (email) VALUES ('your-email@gmail.com')
-- ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- USAGE LIMITS REFERENCE
-- =============================================================================
-- This is a reference table for documentation purposes only
-- Actual limits are enforced in the application code

-- Free Tier Limits:
-- - Transactions: 75 per month
-- - Budgets: 3
-- - Goals: 1
-- - Insights: 3 per week
-- - History: 4 months

-- Paid Tier (Rp 49,000 one-time):
-- - Transactions: Unlimited
-- - Budgets: Unlimited
-- - Goals: Unlimited
-- - Insights: Unlimited
-- - History: Unlimited
-- - Smart Features: Health Score, Cash Flow Forecast, Anomaly Alerts

-- =============================================================================
-- GOOGLE SHEETS TABS REFERENCE
-- =============================================================================
-- This is a reference for the Google Sheets structure created by sheetManager.js

-- Tab 1: Pemasukan (Income) - Columns A-M
-- Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2

-- Tab 2: Pengeluaran (Expenses) - Columns A-M
-- Same layout as Pemasukan

-- Tab 3: Tabungan (Savings) - Columns A-M
-- Same layout as Pemasukan

-- Tab 4: Budgets - Columns A-F
-- Kategori | Bulan | Tahun | Limit | Akun | Catatan

-- Tab 5: Goals - Columns A-H
-- ID | Nama | Target | Deadline | Kategori | Icon | Color | CreatedAt

-- Tab 6: Utang (Debts) - Columns A-I
-- ID | NamaOrang | Jumlah | Arah | JatuhTempo | Status | SisaSaldo | Catatan | CreatedAt

-- Tab 7: Momental (Events) - Columns A-K
-- ID | Nama | Tipe | TanggalMulai | TanggalSelesai | TotalBudget | Mode | Status | DanaTHR | Catatan | CreatedAt

-- Tab 8: EventBudgets - Columns A-F
-- EventID | SubKategori | Limit | Icon | Color | Catatan

-- Tab 9: Tagihan (Bills) - Columns A-M
-- ID | Nama | Jumlah | Tipe | KategoriBill | KategoriTransaksi | Frekuensi | TanggalJatuhTempo | AkunBank | Aktif | TerakhirDibayar | Catatan | CreatedAt

-- Tab 10: Settings - Columns A-B
-- Key | Value
