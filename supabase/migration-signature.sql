-- ============================================================
-- APTAMA V3: Signature-based attendance migration
-- Run this AFTER setup-full.sql (+ migration-rpc-fixes /
-- migration-security-hardening) in Supabase SQL Editor.
-- Fully idempotent — safe to re-run.
--
-- Changes:
--  1. New columns on attendances (check_in_at, signature_path,
--     attendance_source, verified_by) — old face_* / verified_status
--     columns are KEPT for back-compat (marked deprecated).
--  2. New private storage bucket `signatures` + RLS policies.
--  3. Admin auth: session tokens (admin_sessions) instead of sending
--     the raw PIN from the browser on every request.
--  4. QR check-in via signature: resolve_qr_token (full info +
--     error messages) + submit_attendance_with_signature.
--  5. Admin RPCs: get attendance v2, mark present, undo, signed URL.
--  6. Views + RLS updates (privacy: members_public only id/name/group).
-- ============================================================

-- ============================================
-- 1. ADD NEW COLUMNS TO attendances (preserve old data)
-- ============================================
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_at timestamptz;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS signature_path text;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS attendance_source text DEFAULT 'admin_manual'
  CHECK (attendance_source IN ('member_signature', 'admin_manual', 'izin', 'legacy'));
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS verified_by text;

-- Backfill existing rows: attendance_source based on verified_status
UPDATE attendances
SET attendance_source = CASE
  WHEN verified_status = 'auto' THEN 'member_signature'
  WHEN verified_status = 'manual' THEN 'admin_manual'
  ELSE 'legacy'
END
WHERE attendance_source IS NULL OR attendance_source = 'admin_manual';

-- Backfill check_in_at from submitted_at for rows that have it
UPDATE attendances
SET check_in_at = submitted_at
WHERE check_in_at IS NULL AND submitted_at IS NOT NULL;

-- ============================================
-- 2. ADD INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendances_event_id ON attendances(event_id);
CREATE INDEX IF NOT EXISTS idx_attendances_member_id ON attendances(member_id);

-- ============================================
-- 3. SIGNA TURE STORAGE BUCKET (private)
-- ============================================
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

-- Enforce 2MB limit server-side (storage API level) if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets'
      AND column_name = 'file_size_limit'
  ) THEN
    UPDATE storage.buckets SET file_size_limit = 2097152 WHERE id = 'signatures';
  END IF;
END $$;

-- Drop old policies
DROP POLICY IF EXISTS "anon_upload_signatures" ON storage.objects;
DROP POLICY IF EXISTS "admin_read_signatures" ON storage.objects;
DROP POLICY IF EXISTS "member_upload_signature" ON storage.objects;
DROP POLICY IF EXISTS "signed_url_access_signatures" ON storage.objects;

-- Anonymous can upload during QR check-in. Filenames are random UUIDs
-- (generated client-side), so paths are unguessable. Extension + folder
-- are validated here; existence + size are re-checked server-side in
-- submit_attendance_with_signature().
CREATE POLICY "member_upload_signature"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = 'checkin'
    AND lower(storage.extension(name)) IN ('png', 'webp')
  );

-- Signed-URL creation (storage.object.sign) + retrieval only. The app uses
-- only the anon key (no Supabase Auth), so "admin-only" reads are enforced
-- via: private bucket, random unguessable filenames, and PIN/token-verified
-- RPCs that return paths only to the Ketua UI. Direct SELECT/download/list
-- of signature files by anon is intentionally NOT granted.
CREATE POLICY "signed_url_access_signatures"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'signatures'
    AND storage.allow_any_operation(array[
      'storage.object.sign',
      'storage.object.get_signed'
    ])
  );

-- ============================================
-- 4. ADMIN SESSION TOKENS (no raw PIN in the browser)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  token text PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_all_admin_sessions" ON admin_sessions;
CREATE POLICY "block_all_admin_sessions" ON admin_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Login: verify PIN, create session (12h), return token.
-- Re-declare admin_verify_pin to a single robust definition that reads the
-- admin_config key/value store, so admin_login works no matter which older
-- baseline variant (setup-full / admin-pin / migration-rpc-fixes) is present.
CREATE OR REPLACE FUNCTION public.admin_verify_pin(p_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash';
  IF v_hash IS NULL OR p_pin IS NULL THEN RETURN false; END IF;
  RETURN v_hash = encode(digest(p_pin, 'sha256'), 'hex');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_verify_pin(text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_login(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  -- Rate limit: max 5 failures per 5 minutes
  IF (SELECT count(*) FROM admin_pin_attempts
      WHERE attempted_at > now() - interval '5 minutes' AND success = false) >= 5 THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.';
  END IF;

  IF NOT public.admin_verify_pin(p_pin) THEN
    INSERT INTO admin_pin_attempts (success) VALUES (false);
    RAISE EXCEPTION 'PIN salah';
  END IF;

  INSERT INTO admin_pin_attempts (success) VALUES (true);

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + interval '12 hours';

  INSERT INTO admin_sessions (token, expires_at) VALUES (v_token, v_expires);

  RETURN jsonb_build_object('token', v_token, 'expires_at', v_expires);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_login(text) TO anon;

-- Validate a session token (server-verified). Slides last_seen.
CREATE OR REPLACE FUNCTION public.admin_validate_session(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_expires timestamptz;
BEGIN
  SELECT expires_at INTO v_expires FROM admin_sessions WHERE token = p_token;
  IF v_expires IS NULL OR now() > v_expires THEN
    DELETE FROM admin_sessions WHERE token = p_token;
    RETURN false;
  END IF;
  UPDATE admin_sessions SET last_seen_at = now() WHERE token = p_token;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_validate_session(text) TO anon;

-- Helper used by all admin RPCs: raise unless the session is valid.
CREATE OR REPLACE FUNCTION public.admin_require_session(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  IF p_token IS NULL OR NOT public.admin_validate_session(p_token) THEN
    RAISE EXCEPTION 'Sesi berakhir. Silakan masuk lagi.';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_require_session(text) TO anon;

-- Logout: invalidate the token.
CREATE OR REPLACE FUNCTION public.admin_logout(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  DELETE FROM admin_sessions WHERE token = p_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_logout(text) TO anon;

-- ============================================
-- 5. CONVERT ADMIN RPCs FROM PIN TO SESSION TOKEN
-- (CREATE OR REPLACE keeps the same arg types; only the meaning of
--  the first text param changes from p_pin to p_token.)
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_add_member(
  p_token text,
  p_name text,
  p_group text DEFAULT null,
  p_phone text DEFAULT null
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_id uuid;
BEGIN
  PERFORM public.admin_require_session(p_token);
  INSERT INTO members (name, "group", phone)
  VALUES (p_name, p_group, p_phone)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_member(text, text, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_update_member(
  p_token text,
  p_member_id uuid,
  p_name text,
  p_group text DEFAULT null,
  p_phone text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  UPDATE members
  SET name = p_name, "group" = p_group, phone = p_phone
  WHERE id = p_member_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_member(text, uuid, text, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_delete_member(
  p_token text,
  p_member_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  DELETE FROM members WHERE id = p_member_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_member(text, uuid) TO anon;

-- Admin-only member list (includes phone; anon members_public hides it).
CREATE OR REPLACE FUNCTION public.admin_get_members(p_token text)
RETURNS TABLE (id uuid, name text, "group" text, phone text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  RETURN QUERY SELECT m.id, m.name, m."group", m.phone, m.created_at
  FROM members m ORDER BY m.name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_members(text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_add_event(
  p_token text,
  p_title text,
  p_date date,
  p_time time DEFAULT null,
  p_location text DEFAULT null,
  p_checkin_close_at timestamptz DEFAULT null
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_id uuid;
BEGIN
  PERFORM public.admin_require_session(p_token);
  INSERT INTO events (title, date, time, location, checkin_close_at)
  VALUES (p_title, p_date, p_time, p_location, p_checkin_close_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_event(text, text, date, time, text, timestamptz) TO anon;

CREATE OR REPLACE FUNCTION public.admin_update_event(
  p_token text,
  p_event_id uuid,
  p_title text,
  p_date date,
  p_time time DEFAULT null,
  p_location text DEFAULT null,
  p_checkin_close_at timestamptz DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  UPDATE events
  SET title = p_title, date = p_date, time = p_time,
      location = p_location, checkin_close_at = p_checkin_close_at
  WHERE id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_event(text, uuid, text, date, time, text, timestamptz) TO anon;

CREATE OR REPLACE FUNCTION public.admin_delete_event(
  p_token text,
  p_event_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  DELETE FROM events WHERE id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_event(text, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.admin_generate_checkin_qr(
  p_token text,
  p_event_id uuid,
  p_minutes int DEFAULT 120
)
RETURNS TABLE (event_id uuid, checkin_token text, checkin_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  PERFORM public.admin_require_session(p_token);
  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(mins => p_minutes);
  UPDATE events
  SET checkin_token = v_token, checkin_expires_at = v_expires
  WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kegiatan tidak ditemukan'; END IF;
  RETURN QUERY SELECT p_event_id, v_token, v_expires;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_generate_checkin_qr(text, uuid, int) TO anon;

CREATE OR REPLACE FUNCTION public.import_attendances(
  p_token text,
  p_event_id uuid,
  p_rows jsonb
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE
  v_count int := 0;
  r jsonb;
  v_member_id uuid;
  v_status text;
BEGIN
  PERFORM public.admin_require_session(p_token);
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_status := lower(r->>'status');
    IF v_status NOT IN ('hadir','izin','alfa') THEN CONTINUE; END IF;
    SELECT id INTO v_member_id FROM members
    WHERE lower(name) = lower(r->>'name') LIMIT 1;
    IF v_member_id IS NULL THEN CONTINUE; END IF;
    INSERT INTO attendances (event_id, member_id, status, note, verified_status, attendance_source)
    VALUES (p_event_id, v_member_id, v_status, r->>'note', 'manual',
            CASE WHEN v_status = 'izin' THEN 'izin' ELSE 'admin_manual' END)
    ON CONFLICT (event_id, member_id)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note,
                  verified_status = 'manual', attendance_source = EXCLUDED.attendance_source;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.import_attendances(text, uuid, jsonb) TO anon;

-- Change PIN now uses the session token as proof of identity instead of the
-- old PIN (the browser no longer holds the PIN). Same 3-text-arg shape so a
-- CREATE OR REPLACE would work, but the older migration shipped a TEXT
-- return type, so we DROP first to normalise the signature.
DROP FUNCTION IF EXISTS public.admin_change_pin(text, text, text);
DROP FUNCTION IF EXISTS public.admin_change_pin(text, text);

CREATE OR REPLACE FUNCTION public.admin_change_pin(
  p_token text,
  p_new_pin text,
  p_recovery_pin text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  IF p_new_pin IS NULL OR length(trim(p_new_pin)) < 4 THEN
    RAISE EXCEPTION 'PIN baru minimal 4 digit.';
  END IF;
  UPDATE admin_config SET value = encode(digest(p_new_pin, 'sha256'), 'hex')
  WHERE key = 'pin_hash';
  IF p_recovery_pin IS NOT NULL AND length(trim(p_recovery_pin)) > 0 THEN
    INSERT INTO admin_config (key, value)
    VALUES ('recovery_pin_hash', encode(digest(p_recovery_pin, 'sha256'), 'hex'))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_change_pin(text, text, text) TO anon;

-- ============================================
-- 6. QR RESOLVE (full info + error messages)
-- ============================================
-- Replaces the old resolve_qr_token() that only returned event_id.
CREATE OR REPLACE FUNCTION public.resolve_qr_token(p_token text)
RETURNS TABLE (
  event_id uuid,
  title text,
  date date,
  time time,
  location text,
  checkin_expires_at timestamptz,
  is_valid boolean,
  error_message text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
DECLARE
  v_event record;
BEGIN
  SELECT e.id, e.title, e.date, e.time, e.location, e.checkin_expires_at
  INTO v_event
  FROM events e
  WHERE e.checkin_token = p_token;

  IF v_event.id IS NULL THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::date, NULL::time, NULL::text,
      NULL::timestamptz, false::boolean,
      'QR tidak valid. Silakan minta QR baru kepada pengurus.'::text;
    RETURN;
  END IF;

  IF v_event.checkin_expires_at IS NOT NULL AND now() > v_event.checkin_expires_at THEN
    RETURN QUERY SELECT
      v_event.id, v_event.title, v_event.date, v_event.time, v_event.location,
      v_event.checkin_expires_at, false::boolean,
      'QR absensi sudah kedaluwarsa. Silakan minta QR terbaru kepada pengurus.'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_event.id, v_event.title, v_event.date, v_event.time, v_event.location,
    v_event.checkin_expires_at, true::boolean, NULL::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_qr_token(text) TO anon;

-- Public "Scan QR" page: show the currently-active QR without exposing the
-- events table to anon. Returns the single most recently generated QR that
-- has not expired.
CREATE OR REPLACE FUNCTION public.get_active_checkin_qr()
RETURNS TABLE (
  event_id uuid,
  title text,
  date date,
  time time,
  location text,
  checkin_token text,
  checkin_expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
BEGIN
  RETURN QUERY
    SELECT e.id, e.title, e.date, e.time, e.location,
           e.checkin_token, e.checkin_expires_at
    FROM events e
    WHERE e.checkin_token IS NOT NULL
      AND e.checkin_expires_at IS NOT NULL
      AND e.checkin_expires_at > now()
    ORDER BY e.checkin_expires_at DESC
    LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_checkin_qr() TO anon;

-- ============================================
-- 7. SUBMIT ATTENDANCE WITH SIGNATURE (member, via QR)
-- p_signature_path must already exist in the signatures bucket
-- (uploaded client-side by the member). Server-side re-validates:
--   QR token + expiry, member exists, no duplicate, file exists,
--   path shape (checkin/<event>/<random>.png), size <= 2MB.
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_attendance_with_signature(
  p_token text,
  p_member_id uuid,
  p_signature_path text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE
  v_event_id uuid;
  v_expires timestamptz;
  v_event_title text;
  v_member_name text;
  v_member_exists boolean;
  v_already boolean;
  v_obj_exists boolean;
  v_obj_size bigint;
BEGIN
  -- 1. Validate QR token
  SELECT e.id, e.checkin_expires_at, e.title
  INTO v_event_id, v_expires, v_event_title
  FROM events e WHERE e.checkin_token = p_token;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR tidak valid. Silakan minta QR baru kepada pengurus.');
  END IF;
  IF v_expires IS NOT NULL AND now() > v_expires THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR absensi sudah kedaluwarsa. Silakan minta QR terbaru kepada pengurus.');
  END IF;

  -- 2. Validate member
  SELECT EXISTS(SELECT 1 FROM members WHERE id = p_member_id) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anggota tidak ditemukan.');
  END IF;
  SELECT name INTO v_member_name FROM members WHERE id = p_member_id;

  -- 3. Duplicate check
  SELECT EXISTS(
    SELECT 1 FROM attendances
    WHERE event_id = v_event_id AND member_id = p_member_id AND status = 'hadir'
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nama ini sudah tercatat hadir pada kegiatan tersebut.');
  END IF;

  -- 4. Validate signature path shape (prevent traversal / arbitrary refs)
  IF p_signature_path IS NULL
     OR NOT (p_signature_path LIKE 'checkin/%')
     OR NOT (lower(p_signature_path) LIKE '%.png' OR lower(p_signature_path) LIKE '%.webp')
     OR position('..' IN p_signature_path) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tanda tangan tidak valid.');
  END IF;

  -- 5. Verify the uploaded file really exists in storage
  SELECT EXISTS(
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'signatures' AND name = p_signature_path
  ) INTO v_obj_exists;
  IF NOT v_obj_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tanda tangan belum tersimpan. Coba lagi.');
  END IF;

  -- 6. Size re-check (if metadata present)
  SELECT COALESCE((metadata->>'size')::bigint, 0)
  INTO v_obj_size
  FROM storage.objects
  WHERE bucket_id = 'signatures' AND name = p_signature_path;
  IF v_obj_size > 2097152 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ukuran tanda tangan terlalu besar. Maksimal 2 MB.');
  END IF;

  -- 7. Insert attendance (guarded by unique(event_id, member_id))
  INSERT INTO attendances (
    event_id, member_id, status, attendance_source, signature_path,
    check_in_at, submitted_at, verified_status, verified_by
  ) VALUES (
    v_event_id, p_member_id, 'hadir', 'member_signature', p_signature_path,
    now(), now(), 'auto', 'member'
  )
  ON CONFLICT (event_id, member_id) DO NOTHING;

  SELECT EXISTS(
    SELECT 1 FROM attendances
    WHERE event_id = v_event_id AND member_id = p_member_id AND status = 'hadir'
  ) INTO v_already;
  IF NOT v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nama ini sudah tercatat hadir pada kegiatan tersebut.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Absensi berhasil! Selamat datang di kegiatan ' || v_event_title || '.',
    'member_name', v_member_name,
    'event_title', v_event_title
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_attendance_with_signature(text, uuid, text) TO anon;

-- ============================================
-- 8. SELF CHECK-IN (pre-event, no QR) WITH SIGNATURE
-- Member picks an open event (checkin_close_at in the future) +
-- picks name + signs. Reuses the same storage validation.
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_self_checkin_signature(
  p_event_id uuid,
  p_member_id uuid,
  p_signature_path text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE
  v_close timestamptz;
  v_title text;
  v_member_name text;
  v_member_exists boolean;
  v_already boolean;
  v_obj_exists boolean;
  v_obj_size bigint;
BEGIN
  SELECT e.checkin_close_at, e.title INTO v_close, v_title
  FROM events e WHERE e.id = p_event_id;
  IF v_close IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Check-in belum dibuka.');
  END IF;
  IF now() >= v_close THEN
    RETURN jsonb_build_object('success', false, 'error', 'Check-in sudah ditutup.');
  END IF;

  SELECT EXISTS(SELECT 1 FROM members WHERE id = p_member_id) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anggota tidak ditemukan.');
  END IF;
  SELECT name INTO v_member_name FROM members WHERE id = p_member_id;

  SELECT EXISTS(
    SELECT 1 FROM attendances
    WHERE event_id = p_event_id AND member_id = p_member_id AND status = 'hadir'
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nama ini sudah tercatat hadir pada kegiatan tersebut.');
  END IF;

  IF p_signature_path IS NULL
     OR NOT (p_signature_path LIKE 'checkin/%')
     OR NOT (lower(p_signature_path) LIKE '%.png' OR lower(p_signature_path) LIKE '%.webp')
     OR position('..' IN p_signature_path) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tanda tangan tidak valid.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'signatures' AND name = p_signature_path
  ) INTO v_obj_exists;
  IF NOT v_obj_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tanda tangan belum tersimpan. Coba lagi.');
  END IF;

  SELECT COALESCE((metadata->>'size')::bigint, 0)
  INTO v_obj_size
  FROM storage.objects
  WHERE bucket_id = 'signatures' AND name = p_signature_path;
  IF v_obj_size > 2097152 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ukuran tanda tangan terlalu besar. Maksimal 2 MB.');
  END IF;

  INSERT INTO attendances (
    event_id, member_id, status, attendance_source, signature_path,
    check_in_at, submitted_at, verified_status, verified_by
  ) VALUES (
    p_event_id, p_member_id, 'hadir', 'member_signature', p_signature_path,
    now(), now(), 'auto', 'member'
  )
  ON CONFLICT (event_id, member_id) DO NOTHING;

  SELECT EXISTS(
    SELECT 1 FROM attendances
    WHERE event_id = p_event_id AND member_id = p_member_id AND status = 'hadir'
  ) INTO v_already;
  IF NOT v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nama ini sudah tercatat hadir pada kegiatan tersebut.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in berhasil! Sampai jumpa di ' || v_title || '.',
    'member_name', v_member_name,
    'event_title', v_title
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_self_checkin_signature(uuid, uuid, text) TO anon;

-- ============================================
-- 9. ADMIN ATTENDANCE RPCs (session token based)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_attendance_v2(
  p_event_id uuid,
  p_token text
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  member_id uuid,
  status text,
  note text,
  attendance_source text,
  signature_path text,
  check_in_at timestamptz,
  submitted_at timestamptz,
  verified_status text,
  verified_by text,
  member_name text,
  member_group text
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  RETURN QUERY
    SELECT a.id, a.event_id, a.member_id, a.status, a.note,
           a.attendance_source, a.signature_path, a.check_in_at,
           a.submitted_at, a.verified_status, a.verified_by,
           m.name, m."group"
    FROM attendances a
    LEFT JOIN members m ON m.id = a.member_id
    WHERE a.event_id = p_event_id
    ORDER BY m.name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_attendance_v2(uuid, text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_mark_present(
  p_token text,
  p_event_id uuid,
  p_member_id uuid,
  p_admin_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_already boolean;
BEGIN
  PERFORM public.admin_require_session(p_token);

  SELECT EXISTS(
    SELECT 1 FROM attendances
    WHERE event_id = p_event_id AND member_id = p_member_id AND status = 'hadir'
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anggota sudah tercatat hadir.');
  END IF;

  INSERT INTO attendances (
    event_id, member_id, status, attendance_source, check_in_at,
    submitted_at, verified_status, verified_by
  ) VALUES (
    p_event_id, p_member_id, 'hadir', 'admin_manual', now(),
    now(), 'manual', COALESCE(p_admin_name, 'ketua')
  )
  ON CONFLICT (event_id, member_id) DO UPDATE SET
    status = 'hadir',
    attendance_source = 'admin_manual',
    check_in_at = now(),
    submitted_at = now(),
    verified_status = 'manual',
    verified_by = COALESCE(p_admin_name, 'ketua'),
    signature_path = NULL,
    note = NULL;

  RETURN jsonb_build_object('success', true, 'message', 'Anggota berhasil dicatat hadir.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_mark_present(text, uuid, uuid, text) TO anon;

CREATE OR REPLACE FUNCTION public.admin_undo_attendance(
  p_token text,
  p_event_id uuid,
  p_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
DECLARE v_deleted int;
BEGIN
  PERFORM public.admin_require_session(p_token);
  DELETE FROM attendances
  WHERE event_id = p_event_id AND member_id = p_member_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Absensi berhasil dibatalkan.');
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'Data absensi tidak ditemukan.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_undo_attendance(text, uuid, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.admin_upsert_attendance(
  p_token text,
  p_event_id uuid,
  p_member_id uuid,
  p_status text,
  p_note text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  IF p_status NOT IN ('hadir','izin','alfa') THEN
    RAISE EXCEPTION 'Status tidak valid';
  END IF;
  INSERT INTO attendances (event_id, member_id, status, note, verified_status, attendance_source)
  VALUES (p_event_id, p_member_id, p_status, p_note, 'manual',
          CASE WHEN p_status = 'izin' THEN 'izin' ELSE 'admin_manual' END)
  ON CONFLICT (event_id, member_id)
  DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note,
                verified_status = 'manual', attendance_source = EXCLUDED.attendance_source;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_attendance(text, uuid, uuid, text, text) TO anon;

-- Legacy alias kept for back-compat (now token-based).
CREATE OR REPLACE FUNCTION public.admin_get_attendance(p_event_id uuid, p_token text)
RETURNS TABLE (id uuid, event_id uuid, member_id uuid, status text, note text)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
BEGIN
  PERFORM public.admin_require_session(p_token);
  RETURN QUERY
    SELECT a.id, a.event_id, a.member_id, a.status, a.note
    FROM attendances a WHERE a.event_id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_attendance(uuid, text) TO anon;

-- ============================================
-- 10. SIGNATURE VIEWER (admin)
-- Returns the stored signature path so the frontend can build a
-- signed URL with the anon key (SELECT policy restricts the operation
-- to signed-URL generation, so public listing/download is blocked).
-- ============================================
CREATE OR REPLACE FUNCTION public.get_signature_path(
  p_token text,
  p_attendance_id uuid
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $
DECLARE v_path text;
BEGIN
  PERFORM public.admin_require_session(p_token);
  SELECT signature_path INTO v_path
  FROM attendances WHERE id = p_attendance_id;
  RETURN v_path;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_signature_path(text, uuid) TO anon;

-- ============================================
-- 11. UPDATE VIEWS
-- ============================================
DROP VIEW IF EXISTS attendance_public CASCADE;
CREATE OR REPLACE VIEW attendance_public AS
  SELECT id, event_id, member_id, status, attendance_source,
         check_in_at, submitted_at, verified_status
  FROM attendances;
GRANT SELECT ON attendance_public TO anon, authenticated;

CREATE OR REPLACE VIEW admin_attendance_view AS
  SELECT a.*, m.name AS member_name, m."group" AS member_group
  FROM attendances a
  LEFT JOIN members m ON m.id = a.member_id;
GRANT SELECT ON admin_attendance_view TO authenticated;

-- members_public: privacy — anon sees ONLY id, name, group.
DROP VIEW IF EXISTS members_public CASCADE;
CREATE OR REPLACE VIEW public.members_public AS
  SELECT id, name, "group" FROM public.members;
GRANT SELECT ON public.members_public TO anon, authenticated;

-- Drop the face-enroll helper view (face feature removed).
DROP VIEW IF EXISTS public.members_need_face_enroll CASCADE;

-- events_public: no checkin_token exposure to anon.
DROP VIEW IF EXISTS public.events_public CASCADE;
CREATE OR REPLACE VIEW public.events_public AS
  SELECT id, title, date, time, location, checkin_close_at, created_at
  FROM public.events;
GRANT SELECT ON public.events_public TO anon, authenticated;

-- ============================================
-- 12. UPDATED RLS POLICIES
-- ============================================

-- anon CANNOT select main members/events tables directly anymore
-- (privacy). Reads go through members_public / events_public views.
DROP POLICY IF EXISTS "anon_select_members" ON members;
DROP POLICY IF EXISTS "anon_select_members_limited" ON members;
DROP POLICY IF EXISTS "anon_select_events" ON events;
DROP POLICY IF EXISTS "block_all_members" ON members;
DROP POLICY IF EXISTS "block_all_events" ON events;
CREATE POLICY "block_all_members" ON members FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "block_all_events" ON events FOR ALL TO anon USING (false) WITH CHECK (false);

-- Revoke direct table grants for anon (views are granted separately).
REVOKE SELECT ON members FROM anon;
REVOKE SELECT ON events FROM anon;

-- attendances: no direct anon access (writes via RPCs, reads via views).
DROP POLICY IF EXISTS "block_all_attendances" ON attendances;
CREATE POLICY "block_all_attendances" ON attendances
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admin_manage_attendances" ON attendances;
CREATE POLICY "admin_manage_attendances" ON attendances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- admin_sessions / admin_config: block direct access.
DROP POLICY IF EXISTS "block_all_admin_config" ON admin_config;
CREATE POLICY "block_all_admin_config" ON admin_config
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ============================================
-- 13. REVOKE DEFAULT PUBLIC EXECUTE (app only uses the anon key;
--      authenticated/service roles must not call these RPCs)
-- ============================================
REVOKE EXECUTE ON FUNCTION public.admin_verify_pin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_login(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_validate_session(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_require_session(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_logout(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_add_member(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_member(text, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_member(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_members(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_add_event(text, text, date, time, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_event(text, uuid, text, date, time, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_event(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_generate_checkin_qr(text, uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_attendances(text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_change_pin(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_attendance_v2(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_mark_present(text, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_undo_attendance(text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_attendance(text, uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_attendance(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_signature_path(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_qr_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_checkin_qr() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_attendance_with_signature(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_self_checkin_signature(uuid, uuid, text) FROM PUBLIC;
