-- ============================================
-- ADMIN PIN
-- ============================================

-- Tabel admin PIN (hanya 1 baris, simpan hash)
create table admin_config (
  key text primary key,
  value text not null
);

-- Insert PIN default: 1234 (ganti di production!)
-- Hash-nya: encode(digest('1234', 'sha256'), 'hex')
insert into admin_config (key, value)
values ('pin_hash', encode(digest('1234', 'sha256'), 'hex'));

-- RPC: verifikasi PIN (return true/false)
create or replace function public.admin_verify_pin(p_pin text)
returns boolean language plpgsql security definer as $$
declare
  v_hash text;
begin
  select value into v_hash from admin_config where key = 'pin_hash';
  if v_hash is null then return false; end if;
  return v_hash = encode(digest(p_pin, 'sha256'), 'hex');
end;
$$;

grant execute on function public.admin_verify_pin(text) to anon;

-- RPC: ganti PIN (butuh PIN lama)
create or replace function public.admin_change_pin(p_old_pin text, p_new_pin text)
returns void language plpgsql security definer as $$
declare
  v_hash text;
begin
  select value into v_hash from admin_config where key = 'pin_hash';
  if v_hash <> encode(digest(p_old_pin, 'sha256'), 'hex') then
    raise exception 'PIN lama salah';
  end if;
  update admin_config set value = encode(digest(p_new_pin, 'sha256'), 'hex')
  where key = 'pin_hash';
end;
$$;

grant execute on function public.admin_change_pin(text, text) to anon;
