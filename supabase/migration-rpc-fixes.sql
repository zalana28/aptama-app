-- ============================================================
-- MIGRATION 2: RPC fixes for admin_config key-value + qr_tokens cleanup
-- Run each step separately in Supabase SQL Editor.
-- ============================================================

-- Step 1: Fix admin_change_pin RPC to use admin_config (key-value)
DROP FUNCTION IF EXISTS admin_change_pin(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_change_pin(
  p_old_pin TEXT,
  p_new_pin TEXT,
  p_recovery_pin TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_hash TEXT;
  v_new_hash TEXT;
BEGIN
  -- Rate limit: max 5 failures in 5 minutes
  IF (SELECT COUNT(*) FROM admin_pin_attempts
      WHERE attempted_at > now() - INTERVAL '5 minutes' AND success = false) >= 5 THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.';
  END IF;

  -- Get current hash from admin_config (key-value store)
  SELECT value INTO v_old_hash FROM admin_config WHERE key = 'pin_hash' LIMIT 1;

  IF v_old_hash IS NULL THEN
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RAISE EXCEPTION 'PIN belum dikonfigurasi.';
  END IF;

  -- Verify old PIN
  IF encode(digest(p_old_pin, 'sha256'), 'hex') != v_old_hash THEN
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RAISE EXCEPTION 'PIN lama salah.';
  END IF;

  -- Validate new PIN
  IF length(p_new_pin) < 4 THEN
    RAISE EXCEPTION 'PIN baru minimal 4 digit.';
  END IF;

  -- Update PIN hash
  v_new_hash := encode(digest(p_new_pin, 'sha256'), 'hex');
  UPDATE admin_config SET value = v_new_hash WHERE key = 'pin_hash';

  -- Update recovery PIN if provided
  IF p_recovery_pin IS NOT NULL THEN
    UPDATE admin_config SET value = encode(digest(p_recovery_pin, 'sha256'), 'hex')
    WHERE key = 'recovery_pin_hash';
  END IF;

  INSERT INTO admin_pin_attempts (success) VALUES (true);
  RETURN 'PIN berhasil diganti.';
END;
$$;

-- Step 2: Fix admin_reset_pin RPC to use admin_config (key-value)
DROP FUNCTION IF EXISTS admin_reset_pin(TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_reset_pin(
  p_recovery_pin TEXT,
  p_new_pin TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recovery_hash TEXT;
BEGIN
  -- Rate limit
  IF (SELECT COUNT(*) FROM admin_pin_attempts
      WHERE attempted_at > now() - INTERVAL '5 minutes' AND success = false) >= 5 THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.';
  END IF;

  -- Get recovery hash
  SELECT value INTO v_recovery_hash FROM admin_config WHERE key = 'recovery_pin_hash' LIMIT 1;

  IF v_recovery_hash IS NULL THEN
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RAISE EXCEPTION 'Recovery PIN belum dikonfigurasi.';
  END IF;

  -- Verify recovery PIN
  IF encode(digest(p_recovery_pin, 'sha256'), 'hex') != v_recovery_hash THEN
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RAISE EXCEPTION 'Recovery PIN salah.';
  END IF;

  -- Validate new PIN
  IF length(p_new_pin) < 4 THEN
    RAISE EXCEPTION 'PIN baru minimal 4 digit.';
  END IF;

  -- Update PIN hash
  UPDATE admin_config SET value = encode(digest(p_new_pin, 'sha256'), 'hex')
  WHERE key = 'pin_hash';

  INSERT INTO admin_pin_attempts (success) VALUES (true);
  RETURN 'PIN berhasil direset.';
END;
$$;

-- Step 3: Drop qr_tokens table (no longer used — QR tokens now in events.checkin_token)
-- WARNING: Run only after confirming frontend no longer uses resolve_qr_token RPC
DROP TABLE IF EXISTS qr_tokens;

-- Step 4: Drop resolve_qr_token RPC (replaced by direct events query)
DROP FUNCTION IF EXISTS resolve_qr_token(TEXT);
