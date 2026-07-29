-- Phase 3A: Feature gating entitlement and atomic usage helpers.

WITH ranked_admins AS (
  SELECT
    id,
    lower(trim(email)) AS normalized_email,
    row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at, id) AS rn
  FROM admins
)
DELETE FROM admins a
USING ranked_admins r
WHERE a.id = r.id
  AND r.rn > 1;

UPDATE admins
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_email_normalized_check;
ALTER TABLE admins
  ADD CONSTRAINT admins_email_normalized_check CHECK (email = lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_normalized_unique
  ON admins (lower(trim(email)));

CREATE OR REPLACE FUNCTION add_admin(p_email TEXT)
RETURNS admins
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin admins;
BEGIN
  INSERT INTO admins (email)
  VALUES (lower(trim(p_email)))
  ON CONFLICT (email) DO NOTHING
  RETURNING * INTO v_admin;

  RETURN v_admin;
END;
$$;

CREATE OR REPLACE FUNCTION get_usage_count(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
  FROM usage
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION reserve_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT,
  p_limit INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_unlimited BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  SELECT u.tier = 'paid' OR EXISTS (
    SELECT 1 FROM admins a WHERE lower(trim(a.email)) = lower(trim(u.email))
  ) INTO v_unlimited
  FROM users u
  WHERE u.id = p_user_id;

  INSERT INTO usage (user_id, feature, count, period)
  VALUES (p_user_id, p_feature, 0, p_period)
  ON CONFLICT (user_id, feature, period) DO NOTHING;

  SELECT count INTO v_count
  FROM usage
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period
  FOR UPDATE;

  IF NOT v_unlimited AND (p_limit IS NULL OR p_limit < 1) THEN
    RAISE EXCEPTION 'invalid_feature_limit';
  END IF;

  IF NOT v_unlimited AND v_count >= p_limit THEN
    RAISE EXCEPTION 'feature_limit_exceeded';
  END IF;

  UPDATE usage
  SET count = count + 1
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION release_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO usage (user_id, feature, count, period)
  VALUES (p_user_id, p_feature, 0, p_period)
  ON CONFLICT (user_id, feature, period) DO NOTHING;

  SELECT count INTO v_count
  FROM usage
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period
  FOR UPDATE;

  UPDATE usage
  SET count = GREATEST(count - 1, 0)
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO usage (user_id, feature, count, period)
  VALUES (p_user_id, p_feature, 1, p_period)
  ON CONFLICT (user_id, feature, period)
  DO UPDATE SET count = usage.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT,
  p_limit INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_unlimited BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN false;
  END IF;

  SELECT u.tier = 'paid' OR EXISTS (
    SELECT 1 FROM admins a WHERE lower(trim(a.email)) = lower(trim(u.email))
  ) INTO v_unlimited
  FROM users u
  WHERE u.id = p_user_id;

  IF v_unlimited THEN
    RETURN true;
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    RETURN false;
  END IF;

  SELECT get_usage_count(p_user_id, p_feature, p_period) INTO v_count;
  RETURN v_count < p_limit;
END;
$$;

CREATE TABLE IF NOT EXISTS feature_write_claims (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  write_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, write_key)
);

ALTER TABLE feature_write_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feature_write_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE feature_write_claims TO service_role;

CREATE TABLE IF NOT EXISTS feature_creation_locks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  lock_token UUID NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

ALTER TABLE feature_creation_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE feature_creation_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE feature_creation_locks TO service_role;

CREATE OR REPLACE FUNCTION claim_feature_creation(
  p_user_id UUID,
  p_feature TEXT,
  p_lock_token UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_claimed INTEGER;
BEGIN
  IF p_feature IS NULL OR length(trim(p_feature)) = 0 THEN
    RAISE EXCEPTION 'invalid_feature';
  END IF;

  INSERT INTO feature_creation_locks (user_id, feature, lock_token)
  VALUES (p_user_id, p_feature, p_lock_token)
  ON CONFLICT (user_id, feature) DO UPDATE
    SET acquired_at = now(), lock_token = EXCLUDED.lock_token
    WHERE feature_creation_locks.acquired_at < now() - interval '2 minutes';

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION release_feature_creation(
  p_user_id UUID,
  p_feature TEXT,
  p_lock_token UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM feature_creation_locks
  WHERE user_id = p_user_id AND feature = p_feature AND lock_token = p_lock_token;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION claim_feature_write(
  p_user_id UUID,
  p_write_key TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  IF p_write_key IS NULL OR length(trim(p_write_key)) = 0 THEN
    RAISE EXCEPTION 'invalid_write_key';
  END IF;

  INSERT INTO feature_write_claims (user_id, write_key)
  VALUES (p_user_id, p_write_key)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

CREATE OR REPLACE FUNCTION release_feature_write(
  p_user_id UUID,
  p_write_key TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM feature_write_claims
  WHERE user_id = p_user_id AND write_key = p_write_key;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION get_usage_count(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reserve_usage(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_usage(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_usage(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_usage_limit(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_tier_info(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION add_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION remove_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_feature_write(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_feature_write(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_feature_creation(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_feature_creation(UUID, TEXT, UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION get_usage_count(UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION reserve_usage(UUID, TEXT, TEXT, INTEGER) FROM anon, authenticated;
REVOKE ALL ON FUNCTION release_usage(UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION increment_usage(UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION check_usage_limit(UUID, TEXT, TEXT, INTEGER) FROM anon, authenticated;
REVOKE ALL ON FUNCTION get_user_by_email(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION is_admin(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION get_user_tier_info(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION add_admin(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION remove_admin(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION claim_feature_write(UUID, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION release_feature_write(UUID, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION claim_feature_creation(UUID, TEXT, UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION release_feature_creation(UUID, TEXT, UUID) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION get_usage_count(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_usage(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION release_usage(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION is_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_tier_info(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION remove_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_feature_write(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION release_feature_write(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_feature_creation(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION release_feature_creation(UUID, TEXT, UUID) TO service_role;
