-- ============================================================
-- APTAMA V3: signature-migration test suite (15+ cases)
-- Run in Supabase SQL Editor AFTER setup-full.sql,
-- migration-rpc-fixes.sql, migration-security-hardening.sql and
-- migration-signature.sql. Requires default admin PIN = 1234.
--
-- Each DO block is self-contained and cleans up its own test rows.
-- PASS = no output / script completes. FAIL = the assertion raises
-- and the script stops with an error message.
-- ============================================================

-- Small helper: insert a fake uploaded signature object (bypassing RLS).
CREATE OR REPLACE FUNCTION public._t_seed_signature(p_path text, p_size bigint DEFAULT 100)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  SET LOCAL session_replication_role = replica;
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('signatures', p_path, NULL,
          jsonb_build_object('size', p_size, 'mimetype', 'image/png'));
END;
$$;

CREATE OR REPLACE FUNCTION public._t_reset_rate_limit()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  SET LOCAL session_replication_role = replica;
  DELETE FROM admin_pin_attempts;
END;
$$;

-- ============================================================
-- CASE 1: New attendances columns + constraint + indexes
-- ============================================================
DO $$
DECLARE
  v_cols text[] := ARRAY['check_in_at','signature_path','attendance_source','verified_by'];
  v_missing text;
BEGIN
  SELECT string_agg(c.column_name, ', ' ORDER BY c.column_name)
  INTO v_missing
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'attendances'
    AND c.column_name = ANY(v_cols)
  HAVING count(*) <> array_length(v_cols, 1);

  ASSERT v_missing IS NULL, 'CASE 1 FAIL: attendances columns missing';
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendances_attendance_source_check'
  ), 'CASE 1 FAIL: attendance_source CHECK missing';

  INSERT INTO events (title, date) VALUES ('__c1_event__', CURRENT_DATE);
  BEGIN
    INSERT INTO attendances (event_id, member_id, status, attendance_source)
    SELECT id, NULL::uuid, 'hadir', 'bogus' FROM events WHERE title = '__c1_event__' LIMIT 1;
    RAISE EXCEPTION 'CASE 1 FAIL: CHECK did not reject bogus attendance_source';
  EXCEPTION WHEN check_violation THEN NULL; END;
  DELETE FROM events WHERE title = '__c1_event__';

  RAISE NOTICE 'CASE 1 PASS: columns/constraint';
END $$;

-- ============================================================
-- CASE 2: Indexes
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='attendances' AND indexname='idx_attendances_event_id'
  ), 'CASE 2 FAIL: idx_attendances_event_id missing';
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='attendances' AND indexname='idx_attendances_member_id'
  ), 'CASE 2 FAIL: idx_attendances_member_id missing';
  RAISE NOTICE 'CASE 2 PASS: indexes';
END $$;

-- ============================================================
-- CASE 3: signatures bucket (private, 2MB limit)
-- ============================================================
DO $$
DECLARE v_public boolean; v_limit bigint;
BEGIN
  SELECT b.public, COALESCE(b.file_size_limit, 0) INTO v_public, v_limit
  FROM storage.buckets b WHERE b.id = 'signatures';
  ASSERT v_public = false, 'CASE 3 FAIL: signatures bucket must be private';
  ASSERT v_limit = 2097152, 'CASE 3 FAIL: file_size_limit must be 2MB';
  RAISE NOTICE 'CASE 3 PASS: bucket';
END $$;

-- ============================================================
-- CASE 4: storage policies
-- ============================================================
DO $$
DECLARE
  v_upload boolean;
  v_select boolean;
  v_upload_qual text;
  v_select_qual text;
BEGIN
  SELECT count(*) > 0 INTO v_upload
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND policyname='member_upload_signature'
    AND cmd='INSERT' AND roles = ARRAY['anon','authenticated']::name[];
  SELECT count(*) > 0 INTO v_select
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_url_access_signatures'
    AND cmd='SELECT' AND roles = ARRAY['anon','authenticated']::name[];
  ASSERT v_upload, 'CASE 4 FAIL: member_upload_signature INSERT policy missing';
  ASSERT v_select, 'CASE 4 FAIL: signed_url_access_signatures SELECT policy missing';

  -- INSERT policy must be scoped to the signatures bucket + checkin folder
  -- (INSERT policies store their condition in with_check, not qual).
  SELECT with_check INTO v_upload_qual FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND policyname='member_upload_signature';
  ASSERT v_upload_qual LIKE '%bucket_id = ''signatures''%'
    AND v_upload_qual LIKE '%foldername%'
    AND v_upload_qual LIKE '%extension%',
    'CASE 4 FAIL: member_upload_signature not scoped to signatures/checkin: ' || v_upload_qual;

  -- Review fix: SELECT policy must gate on the operation AND require the path
  -- to be attached to an attendance row (no open signing of guessed paths).
  SELECT qual INTO v_select_qual FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_url_access_signatures';
  ASSERT v_select_qual LIKE '%allow_any_operation%'
    AND v_select_qual LIKE '%_is_attached_signature%',
    'CASE 4 FAIL: signed_url_access_signatures must gate on op + attachment: ' || v_select_qual;

  -- No DELETE/UPDATE policy may exist on storage.objects (anon must not be
  -- able to delete or rewrite signatures directly; orphans are cleaned by the
  -- SECURITY DEFINER _cleanup_unattached_signature RPC instead).
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd IN ('DELETE','UPDATE')
  ), 'CASE 4 FAIL: unexpected DELETE/UPDATE policy on storage.objects';

  RAISE NOTICE 'CASE 4 PASS: storage policies';
END $$;

-- ============================================================
-- CASE 4A: RPC grants — all app-facing RPCs EXECUTE granted to anon,
--          revoked from PUBLIC/authenticated/service; internal helpers
--          (admin_verify_pin, admin_require_session, _cleanup_*)
--          NOT callable by anon.
-- ============================================================
DO $$
DECLARE
  v_rpcs text[] := ARRAY[
    'admin_login(text)','admin_validate_session(text)','admin_logout(text)',
    'admin_reset_pin(text,text)','admin_change_pin(text,text,text)',
    'admin_add_member(text,text,text,text)','admin_update_member(text,uuid,text,text,text)',
    'admin_delete_member(text,uuid)','admin_get_members(text)',
    'admin_add_event(text,text,date,time,text,timestamptz)',
    'admin_update_event(text,uuid,text,date,time,text,timestamptz)',
    'admin_delete_event(text,uuid)','admin_generate_checkin_qr(text,uuid,int)',
    'get_active_checkin_qr()','resolve_qr_token(text)',
    'submit_attendance_with_signature(text,uuid,text)',
    'submit_self_checkin_signature(uuid,uuid,text)','submit_izin(uuid,uuid,text)',
    'import_attendances(text,uuid,jsonb)','admin_get_attendance_v2(uuid,text)',
    'admin_mark_present(text,uuid,uuid,text)','admin_undo_attendance(text,uuid,uuid)',
    'admin_upsert_attendance(text,uuid,uuid,text,text)','get_signature_path(text,uuid)'
  ];
  v_fn text;
BEGIN
  FOREACH v_fn IN ARRAY v_rpcs LOOP
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE oid = ('public.' || v_fn)::regprocedure),
      'CASE 4A FAIL: RPC missing: ' || v_fn;
    ASSERT has_function_privilege('anon', ('public.' || v_fn)::regprocedure, 'EXECUTE'),
      'CASE 4A FAIL: anon lacks EXECUTE on ' || v_fn;
    ASSERT NOT has_function_privilege('authenticated', ('public.' || v_fn)::regprocedure, 'EXECUTE'),
      'CASE 4A FAIL: authenticated must NOT execute ' || v_fn;
    ASSERT NOT has_function_privilege('service_role', ('public.' || v_fn)::regprocedure, 'EXECUTE'),
      'CASE 4A FAIL: service_role must NOT execute ' || v_fn;
  END LOOP;

  -- Internal helpers: not directly callable by anon
  ASSERT NOT has_function_privilege('anon', 'public.admin_verify_pin(text)', 'EXECUTE'),
    'CASE 4A FAIL: anon must NOT execute admin_verify_pin';
  ASSERT NOT has_function_privilege('anon', 'public.admin_require_session(text)', 'EXECUTE'),
    'CASE 4A FAIL: anon must NOT execute admin_require_session';
  ASSERT NOT has_function_privilege('anon', 'public._cleanup_unattached_signature(text)', 'EXECUTE'),
    'CASE 4A FAIL: anon must NOT execute _cleanup_unattached_signature';
  ASSERT NOT has_function_privilege('anon', 'public._record_pin_attempt(boolean)', 'EXECUTE'),
    'CASE 4A FAIL: anon must NOT execute _record_pin_attempt';
  -- _is_attached_signature is granted to anon/authenticated so the storage
  -- SELECT policy (which evaluates under the querying role) can call it.
  ASSERT has_function_privilege('anon', 'public._is_attached_signature(text,text)', 'EXECUTE'),
    'CASE 4A FAIL: anon must execute _is_attached_signature';

  RAISE NOTICE 'CASE 4A PASS: RPC grants';
END $$;

-- ============================================================
-- CASE 4B: legacy face/QR RPCs removed (self_check_in, scan_qr_attendance,
--          enroll_face, admin_approve_face, get_member_descriptor,
--          check_in_with_face, admin_mark_manual_attendance)
-- ============================================================
DO $$
BEGIN
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('self_check_in','scan_qr_attendance','enroll_face',
                      'admin_approve_face','get_member_descriptor','check_in_with_face',
                      'admin_mark_manual_attendance')
  ), 'CASE 4B FAIL: legacy face/QR RPC still present';
  RAISE NOTICE 'CASE 4B PASS: legacy RPCs dropped';
END $$;

-- ============================================================
-- CASE 4C: storage access matrix as anon — upload to checkin/ allowed,
--          sign/get_signed allowed ONLY for attendance-attached paths,
--          direct SELECT denied for unattached/guessed paths, DELETE denied.
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_member uuid;
  v_n int;
  v_att uuid;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Matrix Event', CURRENT_DATE, 'matrixqr000001', now() + interval '1 hour')
  RETURNING id INTO v_event;
  INSERT INTO members (name, "group") VALUES ('Test Member Z', 'RT 9') RETURNING id INTO v_member;
  -- Direct inserts (session user is superuser, RLS bypassed). Deliberately NOT
  -- using _t_seed_signature: it sets session_replication_role=replica which
  -- would disable RLS for the rest of this transaction and invalidate the
  -- access-matrix assertions below.
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('signatures', 'checkin/' || v_event || '/attached.png', NULL,
          jsonb_build_object('size', 512, 'mimetype', 'image/png'));
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('signatures', 'checkin/' || v_event || '/guessed.png', NULL,
          jsonb_build_object('size', 512, 'mimetype', 'image/png'));
  INSERT INTO attendances (event_id, member_id, status, attendance_source, signature_path, check_in_at, verified_status, verified_by)
  SELECT v_event, v_member, 'hadir', 'member_signature', 'checkin/' || v_event || '/attached.png', now(), 'auto', 'member'
  RETURNING id INTO v_att;

  SET LOCAL ROLE anon;
  SET LOCAL storage.operation = 'storage.object.sign';

  -- sign allowed for attached path
  SELECT count(*) INTO v_n FROM storage.objects
  WHERE bucket_id='signatures' AND name='checkin/' || v_event || '/attached.png';
  ASSERT v_n = 1, 'CASE 4C FAIL: anon cannot sign an attached signature';

  -- sign DENIED for unattached/guessed path
  SELECT count(*) INTO v_n FROM storage.objects
  WHERE bucket_id='signatures' AND name='checkin/' || v_event || '/guessed.png';
  ASSERT v_n = 0, 'CASE 4C FAIL: anon signed an unattached path';

  -- direct SELECT (no sign/get_signed op) DENIED even for attached path
  SET LOCAL storage.operation = 'storage.object.list';
  SELECT count(*) INTO v_n FROM storage.objects
  WHERE bucket_id='signatures' AND name='checkin/' || v_event || '/attached.png';
  ASSERT v_n = 0, 'CASE 4C FAIL: anon directly listed a signature';

  -- DELETE DENIED (no DELETE policy)
  SET LOCAL storage.operation = 'storage.object.delete';
  DELETE FROM storage.objects WHERE bucket_id='signatures';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ASSERT v_n = 0, 'CASE 4C FAIL: anon deleted signatures';

  RESET ROLE;

  -- anon upload to checkin/ (png) allowed
  SET LOCAL ROLE anon;
  SET LOCAL storage.operation = 'storage.object.insert';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('signatures', 'checkin/' || v_event || '/upload.png', NULL,
          jsonb_build_object('size', 512, 'mimetype', 'image/png'));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ASSERT v_n = 1, 'CASE 4C FAIL: anon could not upload to checkin/';
  RESET ROLE;

  -- cleanup
  DELETE FROM attendances WHERE id = v_att;
  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  PERFORM _t_reset_rate_limit();
  RAISE NOTICE 'CASE 4C PASS: storage access matrix';
END $$;

-- ============================================================
-- CASE 5: admin_sessions table + RLS block
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='admin_sessions'
  ), 'CASE 5 FAIL: admin_sessions missing';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_sessions' AND policyname='block_all_admin_sessions'
  ), 'CASE 5 FAIL: admin_sessions block policy missing';
  RAISE NOTICE 'CASE 5 PASS: admin_sessions';
END $$;

-- ============================================================
-- CASE 6: admin_login — valid PIN returns token jsonb
-- ============================================================
DO $$
DECLARE
  v_res jsonb;
  v_bad text;
BEGIN
  SELECT admin_login('1234') INTO v_res;
  ASSERT v_res ? 'token' AND v_res ? 'expires_at', 'CASE 6 FAIL: login result must contain token+expires_at';
  ASSERT length(v_res->>'token') = 64, 'CASE 6 FAIL: token must be 64 hex chars';

  BEGIN
    SELECT admin_login('0000') INTO v_bad;
    RAISE EXCEPTION 'CASE 6 FAIL: wrong PIN did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'PIN salah' THEN
        RAISE EXCEPTION 'CASE 6 FAIL: unexpected error %', SQLERRM;
      END IF;
  END;

  PERFORM _t_reset_rate_limit();
  RAISE NOTICE 'CASE 6 PASS: admin_login';
END $$;

-- ============================================================
-- CASE 7: session lifecycle — validate / require / logout
-- ============================================================
DO $$
DECLARE
  v_token text;
  v_expired_token text;
BEGIN
  SELECT (admin_login('1234'))->>'token' INTO v_token;
  ASSERT admin_validate_session(v_token) = true, 'CASE 7 FAIL: valid token must validate';

  INSERT INTO admin_sessions (token, expires_at)
  VALUES ('expiredtokentest123', now() - interval '1 hour');
  ASSERT admin_validate_session('expiredtokentest123') = false, 'CASE 7 FAIL: expired token must not validate';

  BEGIN
    PERFORM admin_require_session('expiredtokentest123');
    RAISE EXCEPTION 'CASE 7 FAIL: require_session accepted expired token';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'Sesi berakhir. Silakan masuk lagi.' THEN
        RAISE EXCEPTION 'CASE 7 FAIL: unexpected error %', SQLERRM;
      END IF;
  END;

  PERFORM admin_logout(v_token);
  ASSERT admin_validate_session(v_token) = false, 'CASE 7 FAIL: logout must invalidate token';

  PERFORM _t_reset_rate_limit();
  RAISE NOTICE 'CASE 7 PASS: session lifecycle';
END $$;

-- ============================================================
-- CASE 8: resolve_qr_token — valid / invalid / expired
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_ok uuid; v_valid boolean; v_msg text; v_title text;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Test Event', CURRENT_DATE, 'validqrtoken0001', now() + interval '1 hour')
  RETURNING id INTO v_event;

  SELECT event_id, is_valid, error_message, title
  INTO v_ok, v_valid, v_msg, v_title
  FROM resolve_qr_token('validqrtoken0001');
  ASSERT v_ok = v_event AND v_valid = true AND v_msg IS NULL, 'CASE 8 FAIL: valid QR should resolve';

  SELECT is_valid, error_message FROM resolve_qr_token('unknownqr000000')
  INTO v_valid, v_msg;
  ASSERT v_valid = false AND v_msg = 'QR tidak valid. Silakan minta QR baru kepada pengurus.',
    'CASE 8 FAIL: unknown QR message';

  UPDATE events SET checkin_expires_at = now() - interval '1 minute' WHERE id = v_event;
  SELECT is_valid, error_message FROM resolve_qr_token('validqrtoken0001')
  INTO v_valid, v_msg;
  ASSERT v_valid = false AND v_msg = 'QR absensi sudah kedaluwarsa. Silakan minta QR terbaru kepada pengurus.',
    'CASE 8 FAIL: expired QR message';

  DELETE FROM events WHERE id = v_event;
  RAISE NOTICE 'CASE 8 PASS: resolve_qr_token';
END $$;

-- ============================================================
-- CASE 9: submit_attendance_with_signature — happy path
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_member uuid;
  v_res jsonb;
  v_count int;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Happy Path', CURRENT_DATE, 'happypathqr0001', now() + interval '1 hour')
  RETURNING id INTO v_event;
  INSERT INTO members (name, "group") VALUES ('Test Member A', 'RT 1') RETURNING id INTO v_member;

  PERFORM _t_seed_signature('checkin/' || v_event || '/sig-a.png', 512);

  SELECT submit_attendance_with_signature('happypathqr0001', v_member, 'checkin/' || v_event || '/sig-a.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = true, 'CASE 9 FAIL: happy path should succeed: ' || v_res::text;

  SELECT count(*) INTO v_count
  FROM attendances
  WHERE event_id = v_event AND member_id = v_member;
  ASSERT v_count = 1, 'CASE 9 FAIL: attendance row not inserted';
  SELECT count(*) INTO v_count
  FROM attendances
  WHERE event_id = v_event AND member_id = v_member
    AND attendance_source = 'member_signature'
    AND signature_path = 'checkin/' || v_event || '/sig-a.png'
    AND check_in_at IS NOT NULL
    AND status = 'hadir';
  ASSERT v_count = 1, 'CASE 9 FAIL: signature fields not stored correctly';

  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  RAISE NOTICE 'CASE 9 PASS: happy path';
END $$;

-- ============================================================
-- CASE 10: duplicate submit is blocked
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_member uuid;
  v_res jsonb;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Dup Event', CURRENT_DATE, 'dupqr000000001', now() + interval '1 hour')
  RETURNING id INTO v_event;
  INSERT INTO members (name) VALUES ('Test Member B') RETURNING id INTO v_member;
  PERFORM _t_seed_signature('checkin/' || v_event || '/sig-b.png');

  PERFORM submit_attendance_with_signature('dupqr000000001', v_member, 'checkin/' || v_event || '/sig-b.png');
  SELECT submit_attendance_with_signature('dupqr000000001', v_member, 'checkin/' || v_event || '/sig-b.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false, 'CASE 10 FAIL: duplicate must fail';
  ASSERT v_res->>'error' = 'Nama ini sudah tercatat hadir pada kegiatan tersebut.',
    'CASE 10 FAIL: duplicate message: ' || v_res->>'error';

  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  RAISE NOTICE 'CASE 10 PASS: duplicate blocked';
END $$;

-- ============================================================
-- CASE 11: invalid/missing/oversized signature is rejected
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_member uuid;
  v_res jsonb;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Path Event', CURRENT_DATE, 'pathqr00000001', now() + interval '1 hour')
  RETURNING id INTO v_event;
  INSERT INTO members (name) VALUES ('Test Member C') RETURNING id INTO v_member;

  -- missing file
  SELECT submit_attendance_with_signature('pathqr00000001', v_member, 'checkin/' || v_event || '/missing.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false AND v_res->>'error' = 'Tanda tangan belum tersimpan. Coba lagi.',
    'CASE 11 FAIL: missing file: ' || v_res::text;

  -- traversal path shape
  SELECT submit_attendance_with_signature('pathqr00000001', v_member, 'checkin/../../etc/passwd.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false AND v_res->>'error' = 'Tanda tangan tidak valid.',
    'CASE 11 FAIL: traversal: ' || v_res::text;

  -- oversized file
  PERFORM _t_seed_signature('checkin/' || v_event || '/big.png', 3 * 1024 * 1024);
  SELECT submit_attendance_with_signature('pathqr00000001', v_member, 'checkin/' || v_event || '/big.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false
    AND v_res->>'error' = 'Ukuran tanda tangan terlalu besar. Maksimal 2 MB.',
    'CASE 11 FAIL: oversize: ' || v_res::text;

  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  RAISE NOTICE 'CASE 11 PASS: bad signature rejected';
END $$;

-- ============================================================
-- CASE 12: expired QR / unknown QR on submit
-- ============================================================
DO $$
DECLARE
  v_event uuid;
  v_member uuid;
  v_res jsonb;
BEGIN
  INSERT INTO events (title, date, checkin_token, checkin_expires_at)
  VALUES ('Expired Event', CURRENT_DATE, 'expqreq0000001', now() - interval '1 minute')
  RETURNING id INTO v_event;
  INSERT INTO members (name) VALUES ('Test Member D') RETURNING id INTO v_member;
  PERFORM _t_seed_signature('checkin/' || v_event || '/sig-d.png');

  SELECT submit_attendance_with_signature('expqreq0000001', v_member, 'checkin/' || v_event || '/sig-d.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false
    AND v_res->>'error' = 'QR absensi sudah kedaluwarsa. Silakan minta QR terbaru kepada pengurus.',
    'CASE 12 FAIL: expired: ' || v_res::text;

  SELECT submit_attendance_with_signature('nosuchqr000000', v_member, 'checkin/' || v_event || '/sig-d.png')
  INTO v_res;
  ASSERT (v_res->>'success')::boolean = false
    AND v_res->>'error' = 'QR tidak valid. Silakan minta QR baru kepada pengurus.',
    'CASE 12 FAIL: unknown: ' || v_res::text;

  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  RAISE NOTICE 'CASE 12 PASS: expired/unknown QR';
END $$;

-- ============================================================
-- CASE 13: self check-in (open / closed / not open)
-- ============================================================
DO $$
DECLARE
  v_open uuid; v_closed uuid; v_none uuid;
  v_member uuid;
  v_res jsonb;
BEGIN
  INSERT INTO events (title, date, checkin_close_at)
  VALUES ('Open CI', CURRENT_DATE, now() + interval '2 hours') RETURNING id INTO v_open;
  INSERT INTO events (title, date, checkin_close_at)
  VALUES ('Closed CI', CURRENT_DATE, now() - interval '2 hours') RETURNING id INTO v_closed;
  INSERT INTO events (title, date) VALUES ('None CI', CURRENT_DATE) RETURNING id INTO v_none;
  INSERT INTO members (name) VALUES ('Test Member E') RETURNING id INTO v_member;
  PERFORM _t_seed_signature('checkin/' || v_open || '/sig-e.png');

  SELECT submit_self_checkin_signature(v_open, v_member, 'checkin/' || v_open || '/sig-e.png') INTO v_res;
  ASSERT (v_res->>'success')::boolean = true, 'CASE 13 FAIL: open self checkin: ' || v_res::text;

  SELECT submit_self_checkin_signature(v_closed, v_member, 'checkin/' || v_open || '/sig-e.png') INTO v_res;
  ASSERT (v_res->>'success')::boolean = false AND v_res->>'error' = 'Check-in sudah ditutup.',
    'CASE 13 FAIL: closed: ' || v_res::text;

  SELECT submit_self_checkin_signature(v_none, v_member, 'checkin/' || v_open || '/sig-e.png') INTO v_res;
  ASSERT (v_res->>'success')::boolean = false AND v_res->>'error' = 'Check-in belum dibuka.',
    'CASE 13 FAIL: none: ' || v_res::text;

  DELETE FROM events WHERE id IN (v_open, v_closed, v_none);
  DELETE FROM members WHERE id = v_member;
  RAISE NOTICE 'CASE 13 PASS: self check-in';
END $$;

-- ============================================================
-- CASE 14: admin_get_attendance_v2 + mark_present + undo +
--          get_signature_path (session-gated)
-- ============================================================
DO $$
DECLARE
  v_token text;
  v_event uuid;
  v_member uuid;
  v_att uuid;
  v_path text;
  v_rows int;
  v_res jsonb;
BEGIN
  SELECT (admin_login('1234'))->>'token' INTO v_token;
  INSERT INTO events (title, date) VALUES ('Admin Event', CURRENT_DATE) RETURNING id INTO v_event;
  INSERT INTO members (name, "group") VALUES ('Test Member F', 'RT 2') RETURNING id INTO v_member;
  PERFORM _t_seed_signature('checkin/' || v_event || '/sig-f.png');

  -- mark present
  SELECT admin_mark_present(v_token, v_event, v_member, 'Ketua Test') INTO v_res;
  ASSERT (v_res->>'success')::boolean = true, 'CASE 14 FAIL: mark present: ' || v_res::text;

  -- v2 list includes member_name/group and source
  SELECT count(*) INTO v_rows
  FROM admin_get_attendance_v2(v_event, v_token)
  WHERE member_id = v_member AND status = 'hadir'
    AND attendance_source = 'admin_manual'
    AND member_name = 'Test Member F' AND member_group = 'RT 2';
  ASSERT v_rows = 1, 'CASE 14 FAIL: admin_get_attendance_v2 row missing/incomplete';

  -- session-gated: bad token must raise
  BEGIN
    PERFORM admin_get_attendance_v2(v_event, 'badtoken12345678');
    RAISE EXCEPTION 'CASE 14 FAIL: v2 accepted bad token';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Sesi berakhir. Silakan masuk lagi.' THEN
      RAISE EXCEPTION 'CASE 14 FAIL: unexpected error %', SQLERRM;
    END IF;
  END;

  -- get_signature_path for a member_signature row (sig-f.png already seeded above)
  INSERT INTO attendances (event_id, member_id, status, attendance_source, signature_path, check_in_at, verified_status, verified_by)
  SELECT v_event, v_member, 'hadir', 'member_signature', 'checkin/' || v_event || '/sig-f.png', now(), 'auto', 'member'
  ON CONFLICT (event_id, member_id) DO UPDATE
    SET signature_path = EXCLUDED.signature_path, attendance_source = 'member_signature';
  SELECT id INTO v_att FROM attendances WHERE event_id = v_event AND member_id = v_member;
  SELECT get_signature_path(v_token, v_att) INTO v_path;
  ASSERT v_path = 'checkin/' || v_event || '/sig-f.png', 'CASE 14 FAIL: get_signature_path wrong';

  -- undo removes it
  SELECT admin_undo_attendance(v_token, v_event, v_member) INTO v_res;
  ASSERT (v_res->>'success')::boolean = true, 'CASE 14 FAIL: undo: ' || v_res::text;
  SELECT count(*) INTO v_rows FROM attendances WHERE event_id = v_event AND member_id = v_member;
  ASSERT v_rows = 0, 'CASE 14 FAIL: undo did not delete row';

  DELETE FROM events WHERE id = v_event;
  DELETE FROM members WHERE id = v_member;
  PERFORM _t_reset_rate_limit();
  RAISE NOTICE 'CASE 14 PASS: admin attendance';
END $$;

-- ============================================================
-- CASE 15: privacy views — members_public (id/name/group only),
--          events_public (no checkin_token), anon has no direct
--          SELECT on members / events
-- ============================================================
DO $$
DECLARE
  v_cols text;
  v_n int;
BEGIN
  SELECT string_agg(column_name, ',' ORDER BY column_name) INTO v_cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='members_public';
  ASSERT v_cols = 'group,id,name', 'CASE 15 FAIL: members_public columns = ' || v_cols;

  SELECT count(*) INTO v_n
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='events_public' AND column_name = 'checkin_token';
  ASSERT v_n = 0, 'CASE 15 FAIL: events_public must hide checkin_token';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='members' AND policyname='block_all_members'
  ), 'CASE 15 FAIL: block_all_members policy missing';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='events' AND policyname='block_all_events'
  ), 'CASE 15 FAIL: block_all_events policy missing';

  RAISE NOTICE 'CASE 15 PASS: privacy views/policies';
END $$;

-- ============================================================
-- CASE 16: admin_login rate limit (5 fails / 5 min) — run LAST
-- ============================================================
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM _t_reset_rate_limit();
  FOR i IN 1..5 LOOP
    BEGIN
      PERFORM admin_login('9999');
      RAISE EXCEPTION 'CASE 16 FAIL: bad PIN accepted';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'CASE 16 FAIL: bad PIN accepted' THEN RAISE; END IF;
    END;
  END LOOP;

  BEGIN
    PERFORM admin_login('1234');
    RAISE EXCEPTION 'CASE 16 FAIL: rate limit not applied';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'CASE 16 FAIL: rate limit not applied' THEN RAISE; END IF;
      IF SQLERRM <> 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' THEN
        RAISE EXCEPTION 'CASE 16 FAIL: unexpected error %', SQLERRM;
      END IF;
  END;

  PERFORM _t_reset_rate_limit();
  RAISE NOTICE 'CASE 16 PASS: rate limiting';
END $$;

-- Cleanup helpers
DROP FUNCTION IF EXISTS public._t_seed_signature(text, bigint);
DROP FUNCTION IF EXISTS public._t_reset_rate_limit();
