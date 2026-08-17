-- ============================================================
-- MIGRATION: Per-IP rate limit untuk admin_login & admin_reset_pin (audit M2)
-- ============================================================
-- Latar belakang:
--   Rate limit sebelumnya GLOBAL (5 gagal / 5 menit untuk SEMUA IP).
--   Attacker cukup kirim 5 PIN salah dari mana pun -> ketua terkunci
--   5 menit, bisa diulang terus (DoS). Kolom ip_address di tabel
--   admin_pin_attempts sudah ada sejak awal tapi tidak pernah dipakai.
--
-- Perubahan:
--   1. Helper _client_ip(): ekstrak IP klien asli dari header gateway
--      (x-real-ip, atau entri PALING KANAN x-forwarded-for — entri kiri
--      bisa di-spoof klien). Tanpa dependensi extension.
--   2. admin_login: rate limit per-IP + advisory lock per-IP + cleanup
--      riwayat percobaan lama (>7 hari). Return jsonb (tidak raise),
--      sehingga kegagalan TERCATAT permanen di admin_pin_attempts.
--   3. admin_reset_pin: DIPERBAIKI total — sebelumnya return void dan
--      RAISE EXCEPTION, yang meng-ROLLBACK INSERT kegagalannya sendiri,
--      jadi counter rate limit-nya TIDAK PERNAH bertambah (recovery PIN
--      bisa di-brute-force tanpa batas). Sekarang return jsonb seperti
--      admin_login, kegagalan tercatat, dan per-IP.
--      NOTE: return type berubah void -> jsonb, jadi frontend
--      (src/components/AdminLogin.tsx) ikut diperbarui di PR ini.
--
-- Idempotent (aman di-run ulang). Jalankan di SQL Editor Supabase.
-- ============================================================

-- 0. Helper: IP klien asli
CREATE OR REPLACE FUNCTION public._client_ip()
RETURNS text
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_headers jsonb;
  v_ip text;
  v_xff text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;

  IF v_headers IS NULL OR v_headers = 'null'::jsonb THEN
    RETURN 'unknown';
  END IF;

  -- 1) x-real-ip (di-set gateway ke IP klien asli, tidak bisa di-spoof klien)
  v_ip := trim(coalesce(v_headers->>'x-real-ip', ''));
  IF v_ip <> '' THEN
    RETURN v_ip;
  END IF;

  -- 2) x-forwarded-for: ambil entri PALING KANAN (ditambahkan gateway;
  --    entri kiri bisa di-spoof klien lewat header)
  v_xff := trim(coalesce(v_headers->>'x-forwarded-for', ''));
  IF v_xff <> '' THEN
    RETURN trim(split_part(v_xff, ',', array_length(string_to_array(v_xff, ','), 1)));
  END IF;

  RETURN 'unknown';
END;
$$;
REVOKE EXECUTE ON FUNCTION public._client_ip() FROM PUBLIC;

-- 1. admin_login: rate limit per-IP
CREATE OR REPLACE FUNCTION public.admin_login(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_token text;
  v_expires timestamptz;
  v_ip text := public._client_ip();
  v_fail_count int;
  v_retry_after int;
BEGIN
  -- Serialize percobaan PER IP agar check + increment atomic
  PERFORM pg_advisory_xact_lock(hashtext('aptama_admin_login_' || v_ip));

  -- Housekeeping murah (amortized): purge sesi kedaluwarsa + percobaan lama
  DELETE FROM admin_sessions WHERE expires_at < now();
  DELETE FROM admin_pin_attempts WHERE attempted_at < now() - interval '7 days';

  -- Rate limit: maks 5 kegagalan / 5 menit PER IP
  SELECT count(*) INTO v_fail_count
  FROM admin_pin_attempts
  WHERE attempted_at > now() - interval '5 minutes'
    AND success = false
    AND ip_address = v_ip;

  IF v_fail_count >= 5 THEN
    SELECT GREATEST(1, ceil(extract(epoch FROM (min(attempted_at) + interval '5 minutes' - now())))::int)
      INTO v_retry_after
    FROM admin_pin_attempts
    WHERE attempted_at > now() - interval '5 minutes'
      AND success = false
      AND ip_address = v_ip;
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'rate_limited',
      'retry_after', v_retry_after
    );
  END IF;

  -- PIN salah / config kosong: error_code sama, tanpa kebocoran informasi
  IF NOT public.admin_verify_pin(p_pin) THEN
    INSERT INTO admin_pin_attempts (success, attempted_at, ip_address)
    VALUES (false, now(), v_ip);
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_pin', 'retry_after', 0);
  END IF;

  -- Sukses: bersihkan kegagalan IP ini, jendela 5 menit baru mulai
  DELETE FROM admin_pin_attempts WHERE success = false AND ip_address = v_ip;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + interval '12 hours';
  INSERT INTO admin_sessions (token, expires_at) VALUES (v_token, v_expires);

  RETURN jsonb_build_object('success', true, 'token', v_token, 'expires_at', v_expires);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login(text) TO anon;

-- 2. admin_reset_pin: per-IP + return jsonb (kegagalan tercatat permanen)
-- DROP dulu: return type berubah void -> jsonb (CREATE OR REPLACE tidak bisa
-- mengubah return type)
DROP FUNCTION IF EXISTS public.admin_reset_pin(text, text);

CREATE OR REPLACE FUNCTION public.admin_reset_pin(
  p_recovery_pin text,
  p_new_pin text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_hash text;
  v_ip text := public._client_ip();
  v_fail_count int;
  v_retry_after int;
BEGIN
  -- Serialize percobaan PER IP
  PERFORM pg_advisory_xact_lock(hashtext('aptama_admin_reset_' || v_ip));

  -- Housekeeping: purge sesi kedaluwarsa + percobaan lama
  DELETE FROM admin_sessions WHERE expires_at < now();
  DELETE FROM admin_pin_attempts WHERE attempted_at < now() - interval '7 days';

  -- Rate limit per-IP (counter bersama dengan admin_login)
  SELECT count(*) INTO v_fail_count
  FROM admin_pin_attempts
  WHERE attempted_at > now() - interval '5 minutes'
    AND success = false
    AND ip_address = v_ip;

  IF v_fail_count >= 5 THEN
    SELECT GREATEST(1, ceil(extract(epoch FROM (min(attempted_at) + interval '5 minutes' - now())))::int)
      INTO v_retry_after
    FROM admin_pin_attempts
    WHERE attempted_at > now() - interval '5 minutes'
      AND success = false
      AND ip_address = v_ip;
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'rate_limited',
      'retry_after', v_retry_after
    );
  END IF;

  -- Recovery PIN salah: TERCATAT (return jsonb, bukan raise — raise akan
  -- me-rollback INSERT ini sehingga counter tidak pernah bertambah)
  SELECT value INTO v_hash FROM admin_config WHERE key = 'recovery_pin_hash';
  IF v_hash IS DISTINCT FROM encode(digest(p_recovery_pin, 'sha256'), 'hex') THEN
    INSERT INTO admin_pin_attempts (success, attempted_at, ip_address)
    VALUES (false, now(), v_ip);
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_recovery_pin', 'retry_after', 0);
  END IF;

  -- Validasi PIN baru
  IF p_new_pin IS NULL OR length(trim(p_new_pin)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_new_pin', 'retry_after', 0);
  END IF;

  -- Sukses: bersihkan kegagalan IP ini
  DELETE FROM admin_pin_attempts WHERE success = false AND ip_address = v_ip;
  UPDATE admin_config SET value = encode(digest(p_new_pin, 'sha256'), 'hex')
  WHERE key = 'pin_hash';

  RETURN jsonb_build_object('success', true, 'message', 'PIN berhasil direset.');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_reset_pin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_pin(text, text) TO anon;
