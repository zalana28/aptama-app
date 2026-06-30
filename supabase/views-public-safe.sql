-- APTAMA V2: PUBLIC SAFE VIEWS
-- View ini melindungi data biometrik face_descriptor dari frontend publik
-- Jalankan di SQL Editor Supabase

-- ============================================
-- VIEW: members_public (tanpa face_descriptor)
-- ============================================
-- View ini aman untuk dibaca frontend publik karena tidak expose face_descriptor
CREATE OR REPLACE VIEW public.members_public AS
SELECT
  id,
  name,
  "group",
  face_status,
  face_enrolled_at,
  created_at
FROM public.members;

GRANT SELECT ON public.members_public TO anon, authenticated;

-- ============================================
-- VIEW: members_need_face_enroll
-- ============================================
-- View ini hanya menampilkan anggota yang BELUM daftar wajah
-- (face_status null/none atau face_descriptor null)
-- Anggota pending dan approved TIDAK muncul di sini
CREATE OR REPLACE VIEW public.members_need_face_enroll AS
SELECT
  id,
  name,
  "group"
FROM public.members
WHERE
  face_status IS NULL
  OR face_status = 'none'
  OR face_descriptor IS NULL;

GRANT SELECT ON public.members_need_face_enroll TO anon, authenticated;

-- ============================================
-- CATATAN KEAMANAN
-- ============================================
-- 1. Frontend publik harus pakai members_public atau members_need_face_enroll
-- 2. JANGAN query members.select("*") dari frontend
-- 3. face_descriptor hanya boleh diakses lewat RPC get_member_descriptor
-- 4. Selfie di Storage bucket selfies harus tetap private
-- 5. Signed URL selfie hanya untuk admin/ketua
