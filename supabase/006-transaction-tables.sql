-- =============================================================================
-- Artoku Finance Dashboard - Transaction Data Tables
-- Phase 2: Supabase for Data Storage
-- =============================================================================
-- Run this file AFTER 005-seed.sql

-- Transactions table (replaces Google Sheets Pemasukan/Pengeluaran/Tabungan)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  kategori TEXT NOT NULL,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  pajak NUMERIC DEFAULT 0,
  biaya NUMERIC DEFAULT 0,
  akun_bank TEXT DEFAULT '',
  net NUMERIC DEFAULT 0,
  catatan TEXT DEFAULT '',
  bulan TEXT NOT NULL,
  tahun TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('income', 'expense', 'savings')),
  event_id TEXT DEFAULT '',
  event_sub_kategori TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kategori TEXT NOT NULL,
  bulan TEXT NOT NULL,
  tahun TEXT NOT NULL,
  "limit" NUMERIC NOT NULL DEFAULT 0,
  akun TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, kategori, bulan, tahun, akun)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  target NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  kategori TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama_orang TEXT NOT NULL,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  arah TEXT NOT NULL CHECK (arah IN ('utang', 'piutang')),
  jatuh_tempo DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'settled', 'cancelled')),
  sisa_saldo NUMERIC DEFAULT 0,
  catatan TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table (Momental)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  tipe TEXT DEFAULT 'custom',
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  total_budget NUMERIC DEFAULT 0,
  mode TEXT DEFAULT 'independent',
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  dana_thr NUMERIC DEFAULT 0,
  catatan TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event budgets table
CREATE TABLE IF NOT EXISTS event_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sub_kategori TEXT NOT NULL,
  "limit" NUMERIC DEFAULT 0,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  tipe TEXT DEFAULT 'expense' CHECK (tipe IN ('expense', 'income')),
  kategori_bill TEXT DEFAULT '',
  kategori_transaksi TEXT DEFAULT '',
  frekuensi TEXT DEFAULT 'monthly',
  tanggal_jatuh_tempo INTEGER DEFAULT 1,
  akun_bank TEXT DEFAULT '',
  aktif BOOLEAN DEFAULT true,
  terakhir_dibayar DATE,
  catatan TEXT DEFAULT '',
  row_index INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'apk', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Sync metadata table (tracks last sync for each tab)
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_row_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sheet_name)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tipe ON transactions(tipe);
CREATE INDEX IF NOT EXISTS idx_transactions_bulan_tahun ON transactions(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_transactions_kategori ON transactions(kategori);
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON transactions(tanggal);
CREATE INDEX IF NOT EXISTS idx_transactions_user_tipe_bulan ON transactions(user_id, tipe, bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_bulan ON budgets(user_id, bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_budgets_event_id ON event_budgets(event_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_aktif ON bills(user_id, aktif);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(user_id, key);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_user_sheet ON sync_metadata(user_id, sheet_name);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on transactions" ON transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on budgets" ON budgets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on goals" ON goals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on debts" ON debts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on events" ON events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on event_budgets" ON event_budgets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on bills" ON bills FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on user_settings" ON user_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on sync_metadata" ON sync_metadata FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE transactions IS 'All transactions (income, expense, savings) from web and APK';
COMMENT ON TABLE budgets IS 'Per-category monthly budget limits';
COMMENT ON TABLE goals IS 'Savings goals with progress tracking';
COMMENT ON TABLE debts IS 'Debts and piutang (receivables)';
COMMENT ON TABLE events IS 'Event/milestone budget planning (Momental)';
COMMENT ON TABLE event_budgets IS 'Sub-category budgets for events';
COMMENT ON TABLE bills IS 'Bill reminders with auto-transaction creation';
COMMENT ON TABLE user_settings IS 'Key-value user settings (startingBalance, etc.)';
COMMENT ON TABLE sync_metadata IS 'Tracks last sync timestamp for each Google Sheets tab';
COMMENT ON COLUMN transactions.source IS 'Data source: web (API), apk (mobile app), import (migration)';
