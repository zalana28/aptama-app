-- APTAMA Database Schema for Supabase
-- Jalankan di SQL Editor Supabase

-- ============================================
-- TABEL
-- ============================================

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "group" text,
  phone text,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  location text,
  checkin_close_at timestamptz,
  created_at timestamptz default now()
);

create table attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  status text not null check (status in ('hadir', 'izin', 'alfa')),
  note text,
  unique (event_id, member_id)
);

-- ============================================
-- VIEWS (rekap publik tanpa alasan privat)
-- ============================================

-- Rekap publik TANPA kolom alasan (note)
create view attendance_public as
  select id, event_id, member_id, status
  from attendances;

grant select on attendance_public to anon, authenticated;

-- Rekap jumlah per kegiatan
create view event_recap as
select
  e.id as event_id,
  e.title,
  e.date,
  count(*) filter (where a.status = 'hadir') as hadir,
  count(*) filter (where a.status = 'izin') as izin,
  (select count(*) from members)
    - count(*) filter (where a.status in ('hadir', 'izin')) as alfa
from events e
left join attendances a on a.event_id = e.id
group by e.id, e.title, e.date;

grant select on event_recap to anon, authenticated;

-- Rekap per anggota
create view member_recap as
select
  m.id as member_id,
  m.name,
  count(*) filter (where a.status = 'hadir') as total_hadir,
  count(*) filter (where a.status = 'izin') as total_izin,
  (select count(*) from events) as total_kegiatan
from members m
left join attendances a on a.member_id = m.id
group by m.id, m.name;

grant select on member_recap to anon, authenticated;

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Izin mandiri (anggota tanpa akun)
create or replace function public.submit_izin(
  p_event_id uuid,
  p_member_id uuid,
  p_reason text
)
returns void language plpgsql security definer as $$
begin
  insert into attendances (event_id, member_id, status, note)
  values (p_event_id, p_member_id, 'izin', p_reason)
  on conflict (event_id, member_id)
  do update set status = 'izin', note = excluded.note;
end;
$$;

grant execute on function public.submit_izin(uuid, uuid, text) to anon;

-- Check-in dari rumah (sebelum jam mulai)
create or replace function public.self_check_in(
  p_event_id uuid,
  p_member_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_close timestamptz;
begin
  select checkin_close_at into v_close from events where id = p_event_id;
  if v_close is null then
    raise exception 'Check-in belum dibuka untuk kegiatan ini';
  end if;
  if now() >= v_close then
    raise exception 'Waktu check-in sudah ditutup (sudah masuk jam kegiatan)';
  end if;
  insert into attendances (event_id, member_id, status)
  values (p_event_id, p_member_id, 'hadir')
  on conflict (event_id, member_id) do nothing;
end;
$$;

grant execute on function public.self_check_in(uuid, uuid) to anon;
