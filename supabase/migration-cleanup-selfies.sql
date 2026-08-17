-- ============================================================
-- MIGRATION: Cleanup selfie/face feature (audit K2)
-- ============================================================
-- Latar belakang:
--   Fitur verifikasi wajah (face-api.js) sudah dihapus sejak
--   migration signature (V3), TAPI artefaknya masih tertinggal:
--     - Policy storage "anon upload selfie" & "admin read selfies"
--       masih membuka akses ANON ke bucket 'selfies'
--     - Isi bucket 'selfies' (foto wajah anggota) masih ada
--     - Kolom PII biometrik (face_descriptor, face_selfie_url, dll)
--       masih ada di tabel members & attendances
--   Audit membuktikan anon bisa LIST semua foto wajah + membuat
--   signed URL (hanya dengan kunci publik frontend).
--
-- Isi migration ini:
--   1. Drop SEMUA policy lama terkait bucket selfies
--   2. Hapus semua objek foto wajah di bucket 'selfies'
--   3. Hapus bucket 'selfies'
--   4. Hapus kolom face_* / selfie_url / device_hash / face_match_score
--      (constraint & index yang bergantung ikut terhapus otomatis)
--
-- Idempotent (aman di-run ulang). Jalankan di SQL Editor Supabase.
-- ============================================================

BEGIN;

-- 0. View admin pakai SELECT a.* dari attendances — drop dulu (akan dibuat
--    ulang di langkah 5 setelah kolom face dihapus). Tanpa ini DROP COLUMN
--    gagal: "2BP01: cannot drop column ... because other objects depend on it"
DROP VIEW IF EXISTS public.admin_attendance_view;

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

-- 4. Hapus kolom PII biometrik
ALTER TABLE members DROP COLUMN IF EXISTS face_descriptor;
ALTER TABLE members DROP COLUMN IF EXISTS face_status;
ALTER TABLE members DROP COLUMN IF EXISTS face_enrolled_at;
ALTER TABLE members DROP COLUMN IF EXISTS face_selfie_url;

ALTER TABLE attendances DROP COLUMN IF EXISTS selfie_url;
ALTER TABLE attendances DROP COLUMN IF EXISTS device_hash;
ALTER TABLE attendances DROP COLUMN IF EXISTS face_match_score;

-- 5. Buat ulang view admin (definisi identik dengan migration V3)
CREATE OR REPLACE VIEW public.admin_attendance_view AS
  SELECT a.*, m.name AS member_name, m."group" AS member_group
  FROM attendances a
  LEFT JOIN members m ON m.id = a.member_id;
GRANT SELECT ON public.admin_attendance_view TO authenticated;

COMMIT;
