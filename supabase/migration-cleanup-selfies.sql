-- ============================================================
-- MIGRATION: Cleanup selfie/face feature (audit K2) — v3 (CASCADE)
-- ============================================================
-- v2 gagal di produksi: "2BP01 cannot drop column selfie_url ...
-- view admin_attendance_view depends on column" — berarti di produksi
-- view-nya ada di schema selain public (DROP VIEW IF EXISTS public.*
-- jadi no-op). v3 memakai CASCADE: PostgreSQL otomatis men-drop SEMUA
-- view yang mereferensikan kolom face (di schema mana pun), lalu view
-- admin dibuat ulang di langkah 5. CASCADE juga men-drop view legacy
-- yang membangun di atasnya — itu memang artefak fitur face.
-- Idempotent. Jalankan di SQL Editor Supabase.
-- ============================================================

BEGIN;

-- 0. Drop view admin di schema public (jika ada) + view yang membangun di atasnya
DROP VIEW IF EXISTS public.admin_attendance_view CASCADE;

-- 1. Drop semua policy lama terkait bucket selfies (nama dari berbagai versi migration)
DROP POLICY IF EXISTS "anon upload selfie" ON storage.objects;
DROP POLICY IF EXISTS "admin read selfies" ON storage.objects;
DROP POLICY IF EXISTS "public_upload_selfies" ON storage.objects;

-- 2. Hapus semua objek foto wajah di bucket selfies
-- (storage.objects punya trigger protect_delete; butuh GUC allow_delete_query,
--  pola yang sama dengan _cleanup_unattached_signature di migration V3)
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'selfies';

-- 3. Hapus bucket-nya
DELETE FROM storage.buckets WHERE id = 'selfies';

-- 4. Hapus kolom PII biometrik. CASCADE: view dependen (di schema mana pun,
--    dengan nama apa pun) ikut terhapus otomatis — semuanya artefak face
ALTER TABLE members DROP COLUMN IF EXISTS face_descriptor CASCADE;
ALTER TABLE members DROP COLUMN IF EXISTS face_status CASCADE;
ALTER TABLE members DROP COLUMN IF EXISTS face_enrolled_at CASCADE;
ALTER TABLE members DROP COLUMN IF EXISTS face_selfie_url CASCADE;

ALTER TABLE attendances DROP COLUMN IF EXISTS selfie_url CASCADE;
ALTER TABLE attendances DROP COLUMN IF EXISTS device_hash CASCADE;
ALTER TABLE attendances DROP COLUMN IF EXISTS face_match_score CASCADE;

-- 5. Buat ulang view admin (definisi identik dengan migration V3)
CREATE OR REPLACE VIEW public.admin_attendance_view AS
  SELECT a.*, m.name AS member_name, m."group" AS member_group
  FROM attendances a
  LEFT JOIN members m ON m.id = a.member_id;
GRANT SELECT ON public.admin_attendance_view TO authenticated;

COMMIT;
