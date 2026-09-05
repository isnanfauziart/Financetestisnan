-- Phase 5: admin-controlled global Pro registration capacity valve.
-- The row is global-only; payment creation uses the locked RPC below so a
-- committed close cannot race a new payment request through.

INSERT INTO feature_flags (key, enabled, description)
VALUES ('pro_registration', true, 'Pro registration capacity')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION create_payment_request(
  p_user_id UUID,
  p_amount NUMERIC,
  p_expires_at TIMESTAMPTZ,
  p_replace_expired BOOLEAN DEFAULT false
) RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  registration_flag feature_flags;
  request_user users;
  active_payment payments;
  created_payment payments;
BEGIN
  -- This lock is shared with the admin upsert on feature_flags.key. A close
  -- that commits first is observed here; a request that acquires the lock
  -- first commits before the close and is therefore an admitted request.
  SELECT * INTO registration_flag
  FROM feature_flags
  WHERE key = 'pro_registration'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pro_registration_unavailable';
  END IF;

  IF registration_flag.scheduled_at IS NOT NULL
     AND registration_flag.scheduled_enabled IS NOT NULL
     AND registration_flag.scheduled_at <= now() THEN
    UPDATE feature_flags
    SET enabled = registration_flag.scheduled_enabled,
        scheduled_enabled = NULL,
        scheduled_at = NULL,
        updated_at = now()
    WHERE id = registration_flag.id
    RETURNING * INTO registration_flag;
  END IF;

  IF registration_flag.enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'pro_registration_closed';
  END IF;

  SELECT * INTO request_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF request_user.tier = 'paid' THEN
    RAISE EXCEPTION 'user_already_pro';
  END IF;

  IF p_amount IS NULL OR p_amount <> 40000 OR p_expires_at IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_request';
  END IF;

  -- Preserve the existing 48-hour deadline plus one-hour replacement grace.
  UPDATE payments
  SET status = 'expired', expired_at = now(), updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'awaiting_payment'
    AND created_at < now() - interval '49 hours';

  SELECT * INTO active_payment
  FROM payments
  WHERE user_id = p_user_id
    AND status IN ('awaiting_payment', 'pending')
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF active_payment.status = 'awaiting_payment'
       AND p_replace_expired
       AND now() > COALESCE(active_payment.expires_at, active_payment.created_at + interval '48 hours')
       AND now() <= COALESCE(active_payment.expires_at, active_payment.created_at + interval '48 hours') + interval '1 hour' THEN
      UPDATE payments
      SET status = 'expired', expired_at = now(), updated_at = now()
      WHERE id = active_payment.id
      RETURNING * INTO active_payment;
    ELSE
      RAISE EXCEPTION 'payment_active';
    END IF;
  END IF;

  INSERT INTO payments (user_id, amount, status, expires_at)
  VALUES (p_user_id, p_amount, 'awaiting_payment', p_expires_at)
  RETURNING * INTO created_payment;

  RETURN created_payment;
END;
$$;

REVOKE ALL ON FUNCTION create_payment_request(UUID, NUMERIC, TIMESTAMPTZ, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_payment_request(UUID, NUMERIC, TIMESTAMPTZ, BOOLEAN)
  TO service_role;

COMMENT ON FUNCTION create_payment_request(UUID, NUMERIC, TIMESTAMPTZ, BOOLEAN)
  IS 'Atomically checks global Pro registration capacity and inserts a QRIS payment request; service role only';
