-- Admin user activity metadata. This is not financial ledger data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON users(last_seen_at DESC);

COMMENT ON COLUMN users.last_seen_at IS
  'Most recent authenticated Artami use; updated with a server-side five-minute write guard.';
