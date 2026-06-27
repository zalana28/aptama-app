-- ============================================
-- QR SCAN TOKENS
-- ============================================

create table qr_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- RPC: generate QR token for an event (admin only, via PIN)
create or replace function public.generate_qr_token(
  p_event_id uuid,
  p_pin text,
  p_duration_minutes int default 120
)
returns text language plpgsql security definer as $$
declare
  v_hash text;
  v_token text;
begin
  -- Verify admin PIN
  select value into v_hash from admin_config where key = 'pin_hash';
  if v_hash <> encode(digest(p_pin, 'sha256'), 'hex') then
    raise exception 'PIN salah';
  end if;

  v_token := encode(gen_random_bytes(16), 'hex');

  insert into qr_tokens (event_id, token, expires_at)
  values (p_event_id, v_token, now() + (p_duration_minutes || ' minutes')::interval);

  return v_token;
end;
$$;

grant execute on function public.generate_qr_token(uuid, text, int) to anon;

-- RPC: scan QR and mark attendance
create or replace function public.scan_qr_attendance(
  p_token text,
  p_member_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_event_id uuid;
  v_expires timestamptz;
begin
  select event_id, expires_at into v_event_id, v_expires
  from qr_tokens where token = p_token;

  if v_event_id is null then
    raise exception 'QR code tidak valid';
  end if;

  if now() > v_expires then
    raise exception 'QR code sudah kedaluwarsa';
  end if;

  insert into attendances (event_id, member_id, status)
  values (v_event_id, p_member_id, 'hadir')
  on conflict (event_id, member_id) do update set status = 'hadir';
end;
$$;

grant execute on function public.scan_qr_attendance(text, uuid) to anon;
