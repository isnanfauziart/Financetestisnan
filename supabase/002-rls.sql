-- =============================================================================
-- Artami Finance Dashboard - Row Level Security (RLS) Policies
-- Run this file after 001-schema.sql
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- Users can update their own profile (except tier and spreadsheet_id)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can read all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.email()
    )
  );

-- =============================================================================
-- PAYMENTS TABLE POLICIES
-- =============================================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can insert their own payments
CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Service role can do everything
CREATE POLICY "Service role full access on payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.email()
    )
  );

-- Admins can update payments (for approval/rejection)
CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.email()
    )
  );

-- =============================================================================
-- USAGE TABLE POLICIES
-- =============================================================================

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Service role can do everything
CREATE POLICY "Service role full access on usage"
  ON usage FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- FEATURE FLAGS TABLE POLICIES
-- =============================================================================

-- Everyone can read feature flags (public information)
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access on feature_flags"
  ON feature_flags FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- ADMINS TABLE POLICIES
-- =============================================================================

-- Service role can do everything
CREATE POLICY "Service role full access on admins"
  ON admins FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view admin list
CREATE POLICY "Admins can view admin list"
  ON admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.email()
    )
  );
