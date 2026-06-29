-- APTAMA FULL SETUP (idempotent - aman di-run ulang)
-- Jalankan SEMUA ini di SQL Editor Supabase

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists pgcrypto;

-- ============================================
-- TABEL
-- ============================================

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "group" text,
  phone text,
  -- face verification
  face_descriptor jsonb,
  face_status text DEFAULT 'none' CHECK (face_status IN ('none', 'pending', 'approved')),
  face_enrolled_at timestamptz,
  face_selfie_url text,
  created_at timestamptz DEFAULT now()
);

-- Tambah kolom wajah jika tabel members sudah ada sebelumnya
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_descriptor jsonb;
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_status text DEFAULT 'none';
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_enrolled_at timestamptz;
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_selfie_url text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_face_status_check'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_face_status_check
      CHECK (face_status IN ('none', 'pending', 'approved'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  time time,
  location text,
  checkin_close_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tambah kolom time jika tabel events sudah ada sebelumnya
ALTER TABLE events ADD COLUMN IF NOT EXISTS time time;

CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'alfa')),
  note text,
  -- face verification / anti-cheat
  selfie_url text,
  device_hash text,
  face_match_score numeric,
  verified_status text DEFAULT 'auto' CHECK (verified_status IN ('auto', 'manual', 'pending')),
  submitted_at timestamptz DEFAULT now(),
  UNIQUE (event_id, member_id)
);

-- Tambah kolom wajah/anti-cheat jika tabel attendances sudah ada sebelumnya
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS selfie_url text;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS device_hash text;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS face_match_score numeric;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS verified_status text DEFAULT 'auto';
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendances_verified_status_check'
  ) THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_verified_status_check
      CHECK (verified_status IN ('auto', 'manual', 'pending'));
  END IF;
END;
$$;

-- 1 device hanya boleh 1x submit per kegiatan
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_device
  ON attendances (event_id, device_hash)
  WHERE device_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS + GRANTS + POLICIES (client-side CRUD)
-- Threat model: internal/community use, Ketua-only mutation
-- via UI gate (PIN). RLS off + permissive policies fallback
-- supaya tetap jalan walaupun Supabase force-enable RLS.
-- For production-grade security, replace with RLS policies
-- + SECURITY DEFINER RPCs.
-- ============================================
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_members" ON members;
DROP POLICY IF EXISTS "anon_all_events" ON events;
DROP POLICY IF EXISTS "anon_all_attendances" ON attendances;
DROP POLICY IF EXISTS "anon_all_qr_tokens" ON qr_tokens;
DROP POLICY IF EXISTS "anon_all_admin_config" ON admin_config;

CREATE POLICY "anon_all_members" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_events" ON events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_attendances" ON attendances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_qr_tokens" ON qr_tokens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_admin_config" ON admin_config FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO anon;
-- attendances: no SELECT grant (privasi — view attendance_public tanpa 'note' yang dipakai client)
GRANT INSERT, UPDATE, DELETE ON attendances TO anon;

-- ============================================
-- VIEWS (create or replace)
-- ============================================

CREATE OR REPLACE VIEW attendance_public AS
  SELECT id, event_id, member_id, status, verified_status, submitted_at
  FROM attendances;

GRANT SELECT ON attendance_public TO anon, authenticated;

CREATE OR REPLACE VIEW event_recap AS
SELECT
  e.id AS event_id, e.title, e.date,
  count(*) FILTER (WHERE a.status = 'hadir') AS hadir,
  count(*) FILTER (WHERE a.status = 'izin') AS izin,
  (SELECT count(*) FROM members) - count(*) FILTER (WHERE a.status IN ('hadir','izin')) AS alfa
FROM events e
LEFT JOIN attendances a ON a.event_id = e.id
GROUP BY e.id, e.title, e.date;

GRANT SELECT ON event_recap TO anon, authenticated;

CREATE OR REPLACE VIEW member_recap AS
SELECT
  m.id AS member_id, m.name,
  count(*) FILTER (WHERE a.status = 'hadir') AS total_hadir,
  count(*) FILTER (WHERE a.status = 'izin') AS total_izin,
  (SELECT count(*) FROM events) AS total_kegiatan
FROM members m
LEFT JOIN attendances a ON a.member_id = m.id
GROUP BY m.id, m.name;

GRANT SELECT ON member_recap TO anon, authenticated;

-- ============================================
-- STORAGE BUCKET UNTUK SELFIE (private)
-- ============================================

insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false)
on conflict (id) do nothing;

-- Hapus policy lama yang mungkin bentrok
DROP POLICY IF EXISTS "anon upload selfie" ON storage.objects;
DROP POLICY IF EXISTS "public_upload_selfies" ON storage.objects;
DROP POLICY IF EXISTS "admin_read_selfies" ON storage.objects;

-- Anon boleh upload selfie saat enroll/absen
CREATE POLICY "anon upload selfie"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'selfies');

-- Ketua bisa membaca selfie (via signed URL)
CREATE POLICY "admin read selfies"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'selfies');

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Izin mandiri (anggota tanpa akun)
CREATE OR REPLACE FUNCTION public.submit_izin(p_event_id uuid, p_member_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Alasan izin wajib diisi';
  END IF;
  INSERT INTO attendances (event_id, member_id, status, note)
  VALUES (p_event_id, p_member_id, 'izin', trim(p_reason))
  ON CONFLICT (event_id, member_id) DO UPDATE SET status = 'izin', note = EXCLUDED.note;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_izin(uuid, uuid, text) TO anon;

-- Check-in dari rumah (sebelum jam mulai) + verifikasi wajah
CREATE OR REPLACE FUNCTION public.self_check_in(
  p_event_id uuid,
  p_member_id uuid,
  p_face_score numeric,
  p_selfie_url text DEFAULT null,
  p_device_hash text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_close timestamptz;
  v_face_status text;
BEGIN
  SELECT checkin_close_at INTO v_close FROM events WHERE id = p_event_id;
  IF v_close IS NULL THEN RAISE EXCEPTION 'Check-in belum dibuka';
  END IF;
  IF now() >= v_close THEN RAISE EXCEPTION 'Check-in sudah ditutup';
  END IF;

  SELECT face_status INTO v_face_status FROM members WHERE id = p_member_id;
  IF v_face_status <> 'approved' THEN
    RAISE EXCEPTION 'Wajah belum terdaftar / belum di-approve ketua';
  END IF;
  IF p_face_score IS NULL OR p_face_score > 0.5 THEN
    RAISE EXCEPTION 'Wajah tidak cocok';
  END IF;

  INSERT INTO attendances (
    event_id, member_id, status, selfie_url, device_hash,
    face_match_score, verified_status, submitted_at
  )
  VALUES (
    p_event_id, p_member_id, 'hadir', p_selfie_url, p_device_hash,
    p_face_score, 'auto', now()
  )
  ON CONFLICT (event_id, member_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.self_check_in(
  uuid, uuid, numeric, text, text
) TO anon;

-- Verifikasi PIN
CREATE OR REPLACE FUNCTION public.admin_verify_pin(p_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash';
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN v_hash = encode(digest(p_pin, 'sha256'), 'hex');
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_verify_pin(text) TO anon;

-- Ganti PIN
CREATE OR REPLACE FUNCTION public.admin_change_pin(p_old_pin text, p_new_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash';
  IF v_hash <> encode(digest(p_old_pin, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PIN lama salah';
  END IF;
  UPDATE admin_config SET value = encode(digest(p_new_pin, 'sha256'), 'hex') WHERE key = 'pin_hash';
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_change_pin(text, text) TO anon;

-- Generate QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token(
  p_event_id uuid,
  p_pin text,
  p_duration_minutes int DEFAULT 120
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text; v_token text;
BEGIN
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash';
  IF v_hash <> encode(digest(p_pin, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PIN salah';
  END IF;
  v_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO qr_tokens (event_id, token, expires_at)
  VALUES (p_event_id, v_token, now() + (p_duration_minutes || ' minutes')::interval);
  RETURN v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_qr_token(uuid, text, int) TO anon;

-- Legacy QR scan (tanpa wajah) — tetap ada untuk fallback/manual
CREATE OR REPLACE FUNCTION public.scan_qr_attendance(p_token text, p_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_event_id uuid; v_expires timestamptz;
BEGIN
  SELECT event_id, expires_at INTO v_event_id, v_expires
  FROM qr_tokens WHERE token = p_token;
  IF v_event_id IS NULL THEN RAISE EXCEPTION 'QR code tidak valid'; END IF;
  IF now() > v_expires THEN RAISE EXCEPTION 'QR code sudah kedaluwarsa'; END IF;
  INSERT INTO attendances (event_id, member_id, status, verified_status)
  VALUES (v_event_id, p_member_id, 'hadir', 'manual')
  ON CONFLICT (event_id, member_id) DO UPDATE SET status = 'hadir', verified_status = 'manual';
END;
$$;
GRANT EXECUTE ON FUNCTION public.scan_qr_attendance(text, uuid) TO anon;

-- ============================================================
-- VERIFIKASI WAJAH (face-api.js)
-- ============================================================

-- Anggota daftar wajah sendiri → status pending
CREATE OR REPLACE FUNCTION public.enroll_face(
  p_member_id uuid,
  p_descriptor jsonb,
  p_selfie_url text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE members
     SET face_descriptor = p_descriptor,
         face_status = 'pending',
         face_enrolled_at = now(),
         face_selfie_url = p_selfie_url
   WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anggota tidak ditemukan';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.enroll_face(uuid, jsonb, text) TO anon;

-- Ketua approve/tolak wajah
CREATE OR REPLACE FUNCTION public.admin_approve_face(
  p_pin text,
  p_member_id uuid,
  p_approve boolean DEFAULT true
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN RAISE EXCEPTION 'PIN salah'; END IF;
  UPDATE members
     SET face_status = CASE WHEN p_approve THEN 'approved' ELSE 'none' END,
         face_descriptor = CASE WHEN p_approve THEN face_descriptor ELSE null END
   WHERE id = p_member_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_face(text, uuid, boolean) TO anon;

-- Ambil descriptor SATU anggota yang sudah approved (untuk dicocokkan)
CREATE OR REPLACE FUNCTION public.get_member_descriptor(p_member_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT face_descriptor FROM members
  WHERE id = p_member_id AND face_status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.get_member_descriptor(uuid) TO anon;

-- Absen dengan QR + verifikasi wajah + anti device-dobel
CREATE OR REPLACE FUNCTION public.check_in_with_face(
  p_event_id uuid,
  p_token text,
  p_member_id uuid,
  p_face_score numeric,
  p_selfie_url text DEFAULT null,
  p_device_hash text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event_id uuid;
  v_expires timestamptz;
  v_face_status text;
BEGIN
  SELECT qt.event_id, qt.expires_at INTO v_event_id, v_expires
  FROM qr_tokens qt WHERE qt.token = p_token;

  IF v_event_id IS NULL OR v_token IS DISTINCT FROM p_token THEN
    RAISE EXCEPTION 'QR tidak valid';
  END IF;
  IF v_expires IS NOT NULL AND now() > v_expires THEN
    RAISE EXCEPTION 'QR sudah kedaluwarsa';
  END IF;

  SELECT face_status INTO v_face_status FROM members WHERE id = p_member_id;
  IF v_face_status <> 'approved' THEN
    RAISE EXCEPTION 'Wajah belum terdaftar / belum di-approve ketua';
  END IF;
  IF p_face_score IS NULL OR p_face_score > 0.5 THEN
    RAISE EXCEPTION 'Wajah tidak cocok';
  END IF;

  INSERT INTO attendances (
    event_id, member_id, status, selfie_url, device_hash,
    face_match_score, verified_status, submitted_at
  )
  VALUES (
    p_event_id, p_member_id, 'hadir', p_selfie_url, p_device_hash,
    p_face_score, 'auto', now()
  )
  ON CONFLICT (event_id, member_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_in_with_face(
  uuid, text, uuid, numeric, text, text
) TO anon;

-- Ketua tandai hadir manual saat wajah gagal dikenali
CREATE OR REPLACE FUNCTION public.admin_mark_manual_attendance(
  p_pin text,
  p_event_id uuid,
  p_member_id uuid,
  p_note text DEFAULT null
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN RAISE EXCEPTION 'PIN salah'; END IF;
  INSERT INTO attendances (event_id, member_id, status, note, verified_status)
  VALUES (p_event_id, p_member_id, 'hadir', p_note, 'manual')
  ON CONFLICT (event_id, member_id)
  DO UPDATE SET status = 'hadir', note = EXCLUDED.note, verified_status = 'manual';
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_mark_manual_attendance(text, uuid, uuid, text) TO anon;

-- ============================================================
-- IMPORT DATA REKAP LAMA (bulk backfill)
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_attendances(
  p_pin text,
  p_event_id uuid,
  p_rows jsonb
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int := 0;
  r jsonb;
  v_member_id uuid;
  v_status text;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN RAISE EXCEPTION 'PIN salah'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_status := lower(r->>'status');
    IF v_status NOT IN ('hadir','izin','alfa') THEN CONTINUE; END IF;

    SELECT id INTO v_member_id FROM members
    WHERE lower(name) = lower(r->>'name')
    LIMIT 1;

    IF v_member_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO attendances (event_id, member_id, status, note, verified_status)
    VALUES (
      p_event_id,
      v_member_id,
      v_status,
      r->>'note',
      'manual'
    )
    ON CONFLICT (event_id, member_id)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, verified_status = 'manual';

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.import_attendances(text, uuid, jsonb) TO anon;

-- ============================================
-- ADMIN PIN (default: 1234)
-- ============================================

INSERT INTO admin_config (key, value)
VALUES ('pin_hash', encode(digest('1234', 'sha256'), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ADMIN: Get attendance WITH notes (alasan izin)
-- Ketua-only: verify PIN, return rows including `note` column.
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_attendance(p_event_id uuid, p_pin text)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  member_id uuid,
  status text,
  note text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM admin_config WHERE key = 'pin_hash';
  IF v_hash IS NULL OR v_hash <> encode(digest(p_pin, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PIN salah';
  END IF;
  RETURN QUERY
    SELECT a.id, a.event_id, a.member_id, a.status, a.note
    FROM attendances a
    WHERE a.event_id = p_event_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_attendance(uuid, text) TO anon;
