-- ============================================================
-- APTAMA V3: READ-ONLY VERIFICATION QUERIES (existing production DB)
-- Run these in Supabase SQL Editor BEFORE running the upgrade
-- (migration-existing-to-signature.sql) to confirm the current state,
-- and AFTER to confirm success. All queries are read-only (no DDL/DML).
--
-- The failed setup-full.sql run in the SQL Editor applies each statement
-- in its own implicit transaction, so statements BEFORE the failing
-- admin_change_pin line may already be applied. These queries detect
-- exactly what exists now.
-- ============================================================

-- 1. admin_change_pin overloads currently present (return types included).
--    Production typically has BOTH:
--      admin_change_pin(text, text)       -> void   (admin-pin.sql / old setup)
--      admin_change_pin(text, text, text) -> text   (migration-rpc-fixes.sql)
--    The 3-arg TEXT overload is what breaks setup-full.sql re-runs (42P13).
SELECT p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname = 'admin_change_pin'
ORDER BY 2;

-- 2. Which base tables exist (members/events/attendances/admin_config)?
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('members','events','attendances','admin_config',
                    'admin_pin_attempts','qr_tokens','admin_sessions')
ORDER BY 1;

-- 3. Are the NEW signature columns already present on attendances?
--    (If yes, a previous upgrade attempt partially/fully applied.)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'attendances'
  AND column_name IN ('check_in_at','signature_path','attendance_source','verified_by')
ORDER BY 1;

-- 4. Storage bucket: is the signatures bucket present? Is it private?
SELECT id, public, file_size_limit
FROM storage.buckets
WHERE id IN ('signatures','selfies')
ORDER BY 1;

-- 5. Legacy face/QR RPCs still present (should exist BEFORE upgrade,
--    must be gone AFTER):
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('self_check_in','scan_qr_attendance','enroll_face',
                    'admin_approve_face','get_member_descriptor',
                    'check_in_with_face','admin_mark_manual_attendance')
ORDER BY 1;

-- 6. RPC grants: which admin RPCs can anon execute today?
--    (Pre-upgrade: PIN-based ones are granted. Post-upgrade: token-based
--    ones are granted, admin_verify_pin / admin_require_session are NOT.)
SELECT p.proname AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname LIKE 'admin_%'
ORDER BY 1, 2;

-- 7. Policy state on members/events/attendances (pre vs post upgrade):
--    Pre:  anon_select_members / anon_select_events exist.
--    Post: block_all_members / block_all_events / block_all_attendances.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('members','events','attendances')
ORDER BY 1, 2, 3;

-- 8. Data counts (sanity check — compare before/after):
SELECT 'members' AS table, count(*) FROM members
UNION ALL SELECT 'events', count(*) FROM events
UNION ALL SELECT 'attendances', count(*) FROM attendances;

-- 9. Custom admin PIN is preserved (do not share the hash; just confirm
--    a row exists and matches your expected key count):
SELECT key, length(value) AS value_length
FROM admin_config
WHERE key IN ('pin_hash','recovery_pin_hash')
ORDER BY 1;

-- ============================================================
-- AFTER-UPGRADE ONLY — these must be absent / present as expected:
--   • admin_change_pin 3-arg now returns void (token-based)
--   • admin_sessions table exists
--   • attendances has signature_path etc.
-- Re-run queries 1-4 and 6-8 to confirm.
-- ============================================================
