-- =============================================================================
-- Artami Finance Dashboard - Database Views
-- Run this file after 003-functions.sql
-- =============================================================================

-- =============================================================================
-- USER DASHBOARD VIEW
-- =============================================================================
-- Summary view for user dashboard display
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT
  u.id,
  u.email,
  u.name,
  u.avatar_url,
  u.tier,
  u.spreadsheet_id,
  u.created_at AS member_since,
  u.updated_at AS last_active,
  -- Payment stats
  COALESCE(p.payment_count, 0) AS payment_count,
  COALESCE(p.last_payment_date, NULL) AS last_payment_date,
  p.last_payment_status
FROM users u
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS payment_count,
    MAX(created_at) AS last_payment_date,
    (ARRAY_AGG(status ORDER BY created_at DESC))[1] AS last_payment_status
  FROM payments
  WHERE user_id = u.id
) p ON true;

-- =============================================================================
-- ADMIN USER MANAGEMENT VIEW
-- =============================================================================
-- View for admin to manage users
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  u.id,
  u.email,
  u.name,
  u.avatar_url,
  u.tier,
  u.spreadsheet_id,
  u.created_at AS member_since,
  u.updated_at AS last_active,
  -- Current month usage
  COALESCE(txn_usage.count, 0) AS transactions_this_month,
  -- Payment history
  COALESCE(pay_stats.payment_count, 0) AS payment_count,
  COALESCE(pay_stats.pending_count, 0) AS pending_payments,
  pay_stats.last_payment_date,
  -- Admin flag
  CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_admin
FROM users u
LEFT JOIN usage txn_usage ON
  txn_usage.user_id = u.id
  AND txn_usage.feature = 'transactions'
  AND txn_usage.period = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS payment_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    MAX(created_at) AS last_payment_date
  FROM payments
  WHERE user_id = u.id
) pay_stats ON true
LEFT JOIN admins a ON LOWER(a.email) = LOWER(u.email)
ORDER BY u.created_at DESC;

-- =============================================================================
-- USAGE ANALYTICS VIEW
-- =============================================================================
-- View for usage analytics across all users
CREATE OR REPLACE VIEW usage_analytics AS
SELECT
  u.id AS user_id,
  u.email,
  u.tier,
  u2.feature,
  u2.period,
  u2.count,
  -- Get limit based on tier and feature
  CASE
    WHEN u.tier = 'paid' THEN -1  -- unlimited
    WHEN u2.feature = 'transactions' AND u2.period LIKE '%-W%' THEN 75  -- weekly
    WHEN u2.feature = 'transactions' THEN 75  -- monthly
    WHEN u2.feature = 'budgets' THEN 3
    WHEN u2.feature = 'goals' THEN 1
    WHEN u2.feature = 'insights' THEN 3
    ELSE -1  -- unknown feature
  END AS limit,
  -- Usage percentage (for non-unlimited)
  CASE
    WHEN u.tier = 'paid' THEN 0
    WHEN u2.feature = 'transactions' THEN ROUND((u2.count::DECIMAL / 75) * 100, 2)
    WHEN u2.feature = 'budgets' THEN ROUND((u2.count::DECIMAL / 3) * 100, 2)
    WHEN u2.feature = 'goals' THEN ROUND((u2.count::DECIMAL / 1) * 100, 2)
    WHEN u2.feature = 'insights' THEN ROUND((u2.count::DECIMAL / 3) * 100, 2)
    ELSE 0
  END AS usage_percentage
FROM users u
JOIN usage u2 ON u2.user_id = u.id;

-- =============================================================================
-- PAYMENT ANALYTICS VIEW
-- =============================================================================
-- View for payment analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT
  DATE_TRUNC('month', p.created_at) AS month,
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE p.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE p.status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE p.status = 'rejected') AS rejected_count,
  SUM(p.amount) FILTER (WHERE p.status = 'approved') AS total_revenue,
  AVG(p.amount) FILTER (WHERE p.status = 'approved') AS avg_payment_amount
FROM payments p
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

-- =============================================================================
-- ACTIVE USERS VIEW
-- =============================================================================
-- View for tracking active users
CREATE OR REPLACE VIEW active_users AS
SELECT
  u.id,
  u.email,
  u.name,
  u.tier,
  u.updated_at AS last_active,
  -- Activity in last 30 days
  CASE
    WHEN u.updated_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN true
    ELSE false
  END AS active_30d,
  -- Activity in last 7 days
  CASE
    WHEN u.updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN true
    ELSE false
  END AS active_7d,
  -- Activity in last 24 hours
  CASE
    WHEN u.updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN true
    ELSE false
  END AS active_24h
FROM users u
ORDER BY u.updated_at DESC;
