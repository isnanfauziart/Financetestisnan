-- =============================================================================
-- Artami Finance Dashboard - Database Schema
-- Phase 1: Supabase + Multi-Tenancy
-- =============================================================================
-- Run this file first in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Stores user accounts linked to Google OAuth
-- Each user gets their own Google Sheet (spreadsheet_id)
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

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================
-- Tracks payment proofs for tier upgrades (free -> paid)
-- Users upload QRIS proof, admin approves/rejects
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

-- =============================================================================
-- USAGE TABLE
-- =============================================================================
-- Tracks feature usage per user per period
-- Used for enforcing free tier limits (e.g., 75 txn/month)
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL, -- e.g. "2026-01" for monthly, "2026-W03" for weekly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature, period)
);

-- =============================================================================
-- FEATURE FLAGS TABLE
-- =============================================================================
-- Global feature toggles for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ADMINS TABLE
-- =============================================================================
-- Stores admin user emails for privileged operations
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Performance indexes for common query patterns

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_spreadsheet_id ON users(spreadsheet_id);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Usage table indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_feature ON usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_usage_user_feature_period ON usage(user_id, feature, period);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage(period);

-- Feature flags table indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Admins table indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
-- Automatically update updated_at timestamp on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE users IS 'User accounts linked to Google OAuth with per-user Google Sheets';
COMMENT ON TABLE payments IS 'Payment proofs for tier upgrades (QRIS)';
COMMENT ON TABLE usage IS 'Feature usage tracking for free tier limits';
COMMENT ON TABLE feature_flags IS 'Global feature toggles for gradual rollout';
COMMENT ON TABLE admins IS 'Admin user emails for privileged operations';

COMMENT ON COLUMN users.tier IS 'User tier: free (limited) or paid (unlimited)';
COMMENT ON COLUMN users.spreadsheet_id IS 'User personal Google Sheet ID';
COMMENT ON COLUMN usage.period IS 'Period format: YYYY-MM for monthly, YYYY-Wnn for weekly';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, approved, or rejected';
