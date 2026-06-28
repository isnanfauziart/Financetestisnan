-- =============================================================================
-- Artami Finance Dashboard - Database Functions
-- Run this file after 002-rls.sql
-- =============================================================================

-- =============================================================================
-- USAGE TRACKING FUNCTIONS
-- =============================================================================

-- Increment usage count for a user/feature/period
-- Creates the record if it doesn't exist
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO usage (user_id, feature, count, period)
  VALUES (p_user_id, p_feature, 1, p_period)
  ON CONFLICT (user_id, feature, period)
  DO UPDATE SET count = usage.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current usage count for a user/feature/period
CREATE OR REPLACE FUNCTION get_usage_count(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(count, 0) INTO v_count
  FROM usage
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period = p_period;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has exceeded usage limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_feature TEXT,
  p_period TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_tier TEXT;
BEGIN
  -- Get user tier
  SELECT tier INTO v_tier FROM users WHERE id = p_user_id;

  -- Paid users have unlimited access
  IF v_tier = 'paid' THEN
    RETURN true;
  END IF;

  -- Check usage count
  v_count := get_usage_count(p_user_id, p_feature, p_period);

  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USER HELPER FUNCTIONS
-- =============================================================================

-- Get user by email (case-insensitive)
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS users AS $$
DECLARE
  v_user users;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE LOWER(email) = LOWER(p_email);

  RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM admins
    WHERE LOWER(email) = LOWER(p_email)
  ) INTO v_exists;

  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user tier info with limits
CREATE OR REPLACE FUNCTION get_user_tier_info(p_user_id UUID)
RETURNS TABLE(
  tier TEXT,
  max_transactions_monthly INTEGER,
  max_budgets INTEGER,
  max_goals INTEGER,
  max_insights_weekly INTEGER,
  max_history_months INTEGER
) AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT u.tier INTO v_tier FROM users u WHERE u.id = p_user_id;

  IF v_tier = 'paid' THEN
    RETURN QUERY SELECT
      v_tier::TEXT,
      -1::INTEGER,  -- unlimited
      -1::INTEGER,  -- unlimited
      -1::INTEGER,  -- unlimited
      -1::INTEGER,  -- unlimited
      -1::INTEGER;  -- unlimited
  ELSE
    RETURN QUERY SELECT
      'free'::TEXT,
      75::INTEGER,   -- 75 txn/month
      3::INTEGER,    -- 3 budgets
      1::INTEGER,    -- 1 goal
      3::INTEGER,    -- 3 insights/week
      4::INTEGER;    -- 4 months history
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FEATURE FLAG FUNCTIONS
-- =============================================================================

-- Check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT COALESCE(enabled, false) INTO v_enabled
  FROM feature_flags
  WHERE key = p_key;

  RETURN v_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all feature flags
CREATE OR REPLACE FUNCTION get_all_feature_flags()
RETURNS TABLE(
  key TEXT,
  enabled BOOLEAN,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    feature_flags.key,
    feature_flags.enabled,
    feature_flags.description
  FROM feature_flags
  ORDER BY feature_flags.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ADMIN FUNCTIONS
-- =============================================================================

-- Add admin by email
CREATE OR REPLACE FUNCTION add_admin(p_email TEXT)
RETURNS admins AS $$
DECLARE
  v_admin admins;
BEGIN
  INSERT INTO admins (email)
  VALUES (LOWER(p_email))
  ON CONFLICT (email) DO NOTHING
  RETURNING * INTO v_admin;

  RETURN v_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove admin by email
CREATE OR REPLACE FUNCTION remove_admin(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM admins
  WHERE LOWER(email) = LOWER(p_email);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
