-- ============================================
-- Migration: Add admin_close_checkin_qr function
-- Allows Ketua to manually close/end an active QR check-in session immediately
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_close_checkin_qr(
  p_token text,
  p_event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.admin_require_session(p_token);
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
