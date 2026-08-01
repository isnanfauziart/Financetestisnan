-- Phase 4 Task 1: private global flags and one user override per feature.

INSERT INTO feature_flags (key, enabled, description)
VALUES
  ('transactions_enabled', true, 'Transaction ledger'),
  ('debts_enabled', true, 'Debt and receivable tracking'),
  ('anomaly_alerts', true, 'Anomaly alerts'),
  ('financial_independence', true, 'Financial independence tracker'),
  ('what_if', true, 'What-if planning'),
  ('year_in_review', true, 'Year in review'),
  ('pdf_reports', true, 'PDF reports'),
  ('payment_qris', true, 'QRIS payment flow')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  scheduled_enabled BOOLEAN,
  scheduled_at TIMESTAMPTZ,
  UNIQUE (user_id, feature_key)
);

ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;
REVOKE ALL ON TABLE feature_flags, feature_flag_overrides FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE feature_flags, feature_flag_overrides TO service_role;

REVOKE ALL ON FUNCTION is_feature_enabled(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_all_feature_flags() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_feature_flags() TO service_role;

CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_user ON feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_feature ON feature_flag_overrides(feature_key);

COMMENT ON TABLE feature_flag_overrides IS 'Private per-user feature flag overrides; service role only';
COMMENT ON COLUMN feature_flags.scheduled_at IS 'One-time UTC transition applied on the first read after this timestamp';
COMMENT ON COLUMN feature_flag_overrides.scheduled_at IS 'One-time UTC transition applied on the first read after this timestamp';
