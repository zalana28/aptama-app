-- ============================================
-- Migration: Add admin_close_checkin_qr function
-- Allows Ketua to manually close/end an active QR check-in session immediately
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_close_checkin_qr(
  p_token text,
  p_event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.admin_verify_session(p_token) AND NOT public.admin_verify_pin(p_token) THEN
    RAISE EXCEPTION 'Sesi admin tidak valid';
  END IF;

  UPDATE events
  SET checkin_token = NULL,
      checkin_expires_at = now()
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kegiatan tidak ditemukan';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_close_checkin_qr(text, uuid) TO anon;
