-- APTAMA FULL SETUP (idempotent - aman di-run ulang)
-- Jalankan SEMUA ini di SQL Editor Supabase

-- ============================================
-- TABEL
-- ============================================

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "group" text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  location text,
  checkin_close_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'alfa')),
  note text,
  UNIQUE (event_id, member_id)
);

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
-- VIEWS (create or replace)
-- ============================================

CREATE OR REPLACE VIEW attendance_public AS
  SELECT id, event_id, member_id, status FROM attendances;

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
-- RPC FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_izin(p_event_id uuid, p_member_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO attendances (event_id, member_id, status, note)
  VALUES (p_event_id, p_member_id, 'izin', p_reason)
  ON CONFLICT (event_id, member_id) DO UPDATE SET status = 'izin', note = EXCLUDED.note;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_izin(uuid, uuid, text) TO anon;

CREATE OR REPLACE FUNCTION public.self_check_in(p_event_id uuid, p_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_close timestamptz;
BEGIN
  SELECT checkin_close_at INTO v_close FROM events WHERE id = p_event_id;
  IF v_close IS NULL THEN RAISE EXCEPTION 'Check-in belum dibuka';
  END IF;
  IF now() >= v_close THEN RAISE EXCEPTION 'Check-in sudah ditutup';
  END IF;
  INSERT INTO attendances (event_id, member_id, status)
  VALUES (p_event_id, p_member_id, 'hadir')
  ON CONFLICT (event_id, member_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.self_check_in(uuid, uuid) TO anon;

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

CREATE OR REPLACE FUNCTION public.generate_qr_token(p_event_id uuid, p_pin text, p_duration_minutes int DEFAULT 120)
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

CREATE OR REPLACE FUNCTION public.scan_qr_attendance(p_token text, p_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_event_id uuid; v_expires timestamptz;
BEGIN
  SELECT event_id, expires_at INTO v_event_id, v_expires
  FROM qr_tokens WHERE token = p_token;
  IF v_event_id IS NULL THEN RAISE EXCEPTION 'QR code tidak valid';
  END IF;
  IF now() > v_expires THEN RAISE EXCEPTION 'QR code sudah kedaluwarsa';
  END IF;
  INSERT INTO attendances (event_id, member_id, status)
  VALUES (v_event_id, p_member_id, 'hadir')
  ON CONFLICT (event_id, member_id) DO UPDATE SET status = 'hadir';
END;
$$;
GRANT EXECUTE ON FUNCTION public.scan_qr_attendance(text, uuid) TO anon;

-- ============================================
-- ADMIN PIN (default: 1234)
-- ============================================

INSERT INTO admin_config (key, value)
VALUES ('pin_hash', encode(digest('1234', 'sha256'), 'hex'))
ON CONFLICT (key) DO NOTHING;
