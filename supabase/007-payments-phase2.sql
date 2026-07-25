-- Phase 2: QRIS payments, private proof storage, admin audit, soft account deletion.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'awaiting_payment';
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payer_name TEXT,
  ADD COLUMN IF NOT EXISTS proof_uploaded_late BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT,
  ADD COLUMN IF NOT EXISTS corrected_by TEXT,
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS correction_note TEXT,
  ADD COLUMN IF NOT EXISTS revoked_by TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS revocation_note TEXT,
  ADD COLUMN IF NOT EXISTS proof_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE payments SET expires_at = created_at + interval '48 hours' WHERE expires_at IS NULL;
ALTER TABLE payments ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (
  status IN ('awaiting_payment', 'pending', 'approved', 'rejected', 'revoked', 'expired', 'cancelled')
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM payments WHERE status IN ('awaiting_payment', 'pending')
    GROUP BY user_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase 2 migration stopped: duplicate active payments must be resolved first';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_active_per_user
  ON payments(user_id) WHERE status IN ('awaiting_payment', 'pending');
CREATE INDEX IF NOT EXISTS idx_payments_user_history ON payments(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_payments_pending_queue ON payments(created_at, id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payments_admin_status_history ON payments(status, created_at DESC, id DESC);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_restored_by TEXT,
  ADD COLUMN IF NOT EXISTS pro_restored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_restore_reason TEXT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

INSERT INTO admins (email) VALUES ('isnanfauzi08@gmail.com') ON CONFLICT (email) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION review_payment(
  target_payment UUID, admin_email TEXT, action_name TEXT,
  reason_text TEXT DEFAULT NULL, note_text TEXT DEFAULT NULL
) RETURNS payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_payment payments;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE lower(email) = lower(admin_email)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO current_payment FROM payments WHERE id = target_payment FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF action_name = 'approve' AND current_payment.status = 'pending' THEN
    UPDATE payments SET status = 'approved', reviewed_by = admin_email, reviewed_at = now(),
      updated_at = now() WHERE id = target_payment RETURNING * INTO current_payment;
    UPDATE users SET tier = 'paid', updated_at = now() WHERE id = current_payment.user_id;
  ELSIF action_name = 'reject' AND current_payment.status = 'pending' THEN
    UPDATE payments SET status = 'rejected', reviewed_by = admin_email, reviewed_at = now(),
      rejection_reason = reason_text, rejection_note = note_text, updated_at = now()
      WHERE id = target_payment RETURNING * INTO current_payment;
  ELSIF action_name = 'revoke' AND current_payment.status = 'approved' THEN
    UPDATE payments SET status = 'revoked', revoked_by = admin_email, revoked_at = now(),
      revocation_reason = reason_text, revocation_note = note_text, updated_at = now()
      WHERE id = target_payment RETURNING * INTO current_payment;
    UPDATE users SET tier = 'free', updated_at = now()
      WHERE id = current_payment.user_id
        AND NOT EXISTS (
          SELECT 1 FROM payments
          WHERE user_id = current_payment.user_id AND id <> target_payment AND status = 'approved'
        )
        AND (pro_restored_at IS NULL OR pro_restored_at <= COALESCE(current_payment.reviewed_at, current_payment.created_at));
  ELSIF action_name = 'correct' AND current_payment.status = 'rejected' THEN
    IF EXISTS (SELECT 1 FROM payments WHERE user_id = current_payment.user_id
      AND id <> target_payment AND status IN ('awaiting_payment', 'pending')) THEN
      RAISE EXCEPTION 'newer_active_payment';
    END IF;
    UPDATE payments SET status = 'approved', corrected_by = admin_email, corrected_at = now(),
      correction_reason = reason_text, correction_note = note_text, updated_at = now()
      WHERE id = target_payment RETURNING * INTO current_payment;
    UPDATE users SET tier = 'paid', updated_at = now() WHERE id = current_payment.user_id;
  ELSE
    RAISE EXCEPTION 'invalid_transition';
  END IF;
  RETURN current_payment;
END; $$;

REVOKE ALL ON FUNCTION review_payment(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_payment(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
