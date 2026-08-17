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

COMMIT;
