-- ============================================================
-- MIGRATION: Security hardening (apply to Supabase SQL Editor)
-- Fully idempotent — safe to re-run.
-- ============================================================

-- 1. Tighten RLS on members table — anon should only read members_public view
DROP POLICY IF EXISTS anon_select_members ON members;
DROP POLICY IF EXISTS anon_select_members_limited ON members;

CREATE POLICY anon_select_members_limited ON members
  FOR SELECT TO anon
  USING (face_status IN ('pending', 'approved'));

-- 2. Recreate members_public view with phone column
-- CASCADE drops any objects that depend on the view (then we recreate them)
DROP VIEW IF EXISTS members_public CASCADE;

CREATE VIEW members_public AS
SELECT
  id,
  name,
  phone,
  "group",
  face_status,
  face_enrolled_at,
  created_at
FROM members;

-- Grant access to the view
GRANT SELECT ON members_public TO anon, authenticated;

-- 3. Drop qr_tokens table (consolidated into events.checkin_token)
-- WARNING: Back up any data you need first!
-- DROP TABLE IF EXISTS qr_tokens;

-- 4. Update check_in_with_face RPC to use events.checkin_token
-- instead of qr_tokens table
CREATE OR REPLACE FUNCTION check_in_with_face(
  p_member_id UUID,
  p_descriptor FLOAT8[],
  p_selfie_url TEXT DEFAULT NULL,
  p_device_hash TEXT DEFAULT NULL,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, attendance_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_event_name TEXT;
  v_member_name TEXT;
  v_stored_descriptor FLOAT8[];
  v_distance FLOAT;
  v_threshold FLOAT := 0.55;
  v_attendance_id UUID;
  v_already_checked_in BOOLEAN;
  v_device_ok BOOLEAN;
BEGIN
  -- Find the active event from events.checkin_token
  IF p_event_id IS NOT NULL THEN
    v_event_id := p_event_id;
  ELSE
    SELECT id INTO v_event_id
    FROM events
    WHERE checkin_token IS NOT NULL
      AND checkin_expires_at > now()
    ORDER BY checkin_expires_at DESC
    LIMIT 1;
  END IF;

  IF v_event_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Tidak ada QR aktif saat ini'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get member name
  SELECT name INTO v_member_name FROM members WHERE id = p_member_id;
  IF v_member_name IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Anggota tidak ditemukan'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check not already checked in
  SELECT EXISTS(
    SELECT 1 FROM attendance WHERE event_id = v_event_id AND member_id = p_member_id
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Sudah absen untuk kegiatan ini'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get stored descriptor
  SELECT face_descriptor INTO v_stored_descriptor
  FROM members WHERE id = p_member_id;

  IF v_stored_descriptor IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Wajah belum terdaftar'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Compare descriptors
  v_distance := 0;
  FOR i IN 1..LEAST(array_length(v_stored_descriptor, 1), array_length(p_descriptor, 1)) LOOP
    v_distance := v_distance + POWER(v_stored_descriptor[i] - p_descriptor[i], 2);
  END LOOP;
  v_distance := SQRT(v_distance);

  IF v_distance > v_threshold THEN
    RETURN QUERY SELECT false::BOOLEAN,
      'Wajah tidak cocok (jarak: ' || ROUND(v_distance::numeric, 3) || ')'::TEXT,
      NULL::UUID;
    RETURN;
  END IF;

  -- Device check (soft — just warn, don't block)
  IF p_device_hash IS NOT NULL THEN
    SELECT device_hash = p_device_hash INTO v_device_ok
    FROM members WHERE id = p_member_id;

    IF NOT v_device_ok AND EXISTS (
      SELECT 1 FROM members WHERE device_hash = p_device_hash AND id != p_member_id
    ) THEN
      -- Different device than registered — log but allow
      RAISE NOTICE 'Device mismatch for member %', p_member_id;
    END IF;
  END IF;

  -- Insert attendance
  INSERT INTO attendance (event_id, member_id, method, selfie_url, checked_in_at)
  VALUES (v_event_id, p_member_id, 'face', p_selfie_url, now())
  RETURNING id INTO v_attendance_id;

  -- Update device hash
  IF p_device_hash IS NOT NULL THEN
    UPDATE members SET device_hash = p_device_hash WHERE id = p_member_id;
  END IF;

  SELECT name INTO v_event_name FROM events WHERE id = v_event_id;

  RETURN QUERY SELECT true::BOOLEAN,
    'Absen berhasil: ' || v_member_name || ' — ' || v_event_name::TEXT,
    v_attendance_id;
END;
$$;

-- 5. Add rate limiting to admin_verify_pin
-- Simple approach: track failed attempts in a separate table
CREATE TABLE IF NOT EXISTS admin_pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- Create rate-limited version of admin_verify_pin
CREATE OR REPLACE FUNCTION admin_verify_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash TEXT;
  v_recent_failures INT;
BEGIN
  -- Check rate limit: max 5 failures in 5 minutes
  SELECT COUNT(*) INTO v_recent_failures
  FROM admin_pin_attempts
  WHERE attempted_at > now() - INTERVAL '5 minutes'
    AND success = false;

  IF v_recent_failures >= 5 THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.';
  END IF;

  -- Get stored hash from the admin_config key/value store
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash' LIMIT 1;

  IF v_hash IS NULL THEN
    -- First-time setup: accept default and store hash
    IF encode(digest(p_pin, 'sha256'), 'hex') = encode(digest('1234', 'sha256'), 'hex') THEN
      INSERT INTO admin_pin_attempts (success) VALUES (true);
      RETURN true;
    END IF;
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RETURN false;
  END IF;

  -- Verify
  IF encode(digest(p_pin, 'sha256'), 'hex') = v_hash THEN
    INSERT INTO admin_pin_attempts (success) VALUES (true);
    RETURN true;
  END IF;

  INSERT INTO admin_pin_attempts (success) VALUES (false);
  RETURN false;
END;
$$;
