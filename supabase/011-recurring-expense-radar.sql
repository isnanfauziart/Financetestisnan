-- Recurring Expense Radar is a Pro-only, read-only recommendation surface.

INSERT INTO feature_flags (key, enabled, description)
VALUES ('recurring_expense_radar', true, 'Recurring expense suggestions')
ON CONFLICT (key) DO NOTHING;
