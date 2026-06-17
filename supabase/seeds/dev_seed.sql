-- ============================================================
-- NSTP Dev Seed  —  dev_seed.sql
--
-- Purpose : Populate realistic dashboard data for local development.
-- Run in  : Supabase SQL editor (Dashboard → SQL editor)
-- Run AFTER: npm run seed-auth-users  (creates auth.users rows for fake accounts)
--
-- All seeded PKs (except the 3 fake auth accounts whose IDs come from
-- auth.users) begin with '5eed'. The teardown script uses this prefix.
--
-- Idempotency: plain INSERTs use ON CONFLICT DO NOTHING.
-- The DO $$ block that creates sessions/events is NOT idempotent —
-- run dev_teardown.sql first if you need to re-seed.
-- ============================================================

-- ── 0. Guard ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.test@up.edu.ph') THEN
    RAISE EXCEPTION
      E'Fake auth accounts not found.\nRun: npm run seed-auth-users  (then re-run this file)';
  END IF;
END $$;

-- ── 1. Terms ────────────────────────────────────────────────
INSERT INTO term (term_id, name, school_year, semester, start_date, end_date, is_active) VALUES
  ('5eed0001-0000-0000-0000-000000000000', '1st Semester AY 2023-2024', '2023-2024', 'first',  '2023-08-14', '2023-12-22', false),
  ('5eed0002-0000-0000-0000-000000000000', '2nd Semester AY 2023-2024', '2023-2024', 'second', '2024-01-15', '2024-05-31', false),
  ('5eed0003-0000-0000-0000-000000000000', '1st Semester AY 2025-2026', '2025-2026', 'first',  '2025-08-11', '2025-12-19', true)
ON CONFLICT DO NOTHING;

-- ── 2. Synthetic advisers (no auth.users rows → zero MAU cost) ──
INSERT INTO app_user (app_user_id, role_id, email, full_name) VALUES
  ('5eed1001-0000-0000-0000-000000000000',
   (SELECT role_id FROM role WHERE code = 'adviser'),
   'ana.reyes@up.edu.ph', 'Ana Reyes'),
  ('5eed1002-0000-0000-0000-000000000000',
   (SELECT role_id FROM role WHERE code = 'adviser'),
   'ben.santos@up.edu.ph', 'Ben Santos'),
  ('5eed1003-0000-0000-0000-000000000000',
   (SELECT role_id FROM role WHERE code = 'adviser'),
   'clara.lim@up.edu.ph', 'Clara Lim')
ON CONFLICT (app_user_id) DO NOTHING;

-- ── 3. Fake account app_user rows ────────────────────────────
-- UPSERT the role so re-running is safe even if a dev logged in first
-- (which would have inserted the row with the default 'student' role).
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id,
       (SELECT role_id FROM role WHERE code = 'admin'),
       'admin.test@up.edu.ph', 'Admin Test Account'
FROM auth.users WHERE email = 'admin.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id,
       (SELECT role_id FROM role WHERE code = 'adviser'),
       'adviser.test@up.edu.ph', 'Adviser Test Account'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id,
       (SELECT role_id FROM role WHERE code = 'student'),
       'student.test@up.edu.ph', 'Student Test Account'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- ── 4. Synthetic students  (5eed2001 … 5eed2050) ────────────
-- No auth.users rows → zero MAU cost.
-- Students 01–20  → adviser.test's active section
-- Students 21–30  → past section 1 classmates
-- Students 31–40  → past section 2 classmates
-- Students 41–50  → current section classmates (alongside student.test)
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT
  ('5eed2' || lpad(g.i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT role_id FROM role WHERE code = 'student'),
  'student' || lpad(g.i::text, 3, '0') || '@up.edu.ph',
  'Student ' || lpad(g.i::text, 3, '0')
FROM generate_series(1, 50) AS g(i)
ON CONFLICT (app_user_id) DO NOTHING;

-- ── 5. Sections ─────────────────────────────────────────────
-- 5eed3001 : adviser.test's active section  (current term)
-- 5eed3002 : student.test's past section 1  (term 1, completed)
-- 5eed3003 : student.test's past section 2  (term 2, completed)
-- 5eed3004 : student.test's current section (current term, active)
INSERT INTO section (section_id, term_id, adviser_user_id, course_code, name, section_status_id, required_hour_total) VALUES
  ('5eed3001-0000-0000-0000-000000000000',
   '5eed0003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 CWTS', 'CWTS-A',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3002-0000-0000-0000-000000000000',
   '5eed0001-0000-0000-0000-000000000000',
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 1 CWTS', 'CWTS-A',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3003-0000-0000-0000-000000000000',
   '5eed0002-0000-0000-0000-000000000000',
   '5eed1002-0000-0000-0000-000000000000',
   'NSTP 1 CWTS', 'CWTS-B',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3004-0000-0000-0000-000000000000',
   '5eed0003-0000-0000-0000-000000000000',
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 2 CWTS', 'CWTS-B',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60)
ON CONFLICT (section_id) DO NOTHING;

-- ── 6. Geofence for adviser.test's section ───────────────────
INSERT INTO section_geofence
  (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active)
VALUES
  ('5eed3101-0000-0000-0000-000000000000',
   '5eed3001-0000-0000-0000-000000000000',
   'UP Baguio Main Campus',
   16.411100, 120.596600, 300, true)
ON CONFLICT (section_geofence_id) DO NOTHING;

-- ── 7. Enrollments ──────────────────────────────────────────

-- 7a. adviser.test's section (students 01–20; student 01 is leader)
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad(g.i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3001-0000-0000-0000-000000000000',
  ('5eed2' || lpad(g.i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active'),
  (g.i = 1)
FROM generate_series(1, 20) AS g(i)
ON CONFLICT DO NOTHING;

-- 7b. student.test — past enrollment 1 (section 5eed3002, completed)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  '5eed4021-0000-0000-0000-000000000000',
  '5eed3002-0000-0000-0000-000000000000',
  id,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- 7c. Classmates in past section 1 (students 21–30)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((21 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3002-0000-0000-0000-000000000000',
  ('5eed2' || lpad((20 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 10) AS g(i)
ON CONFLICT DO NOTHING;

-- 7d. student.test — past enrollment 2 (section 5eed3003, completed)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  '5eed4032-0000-0000-0000-000000000000',
  '5eed3003-0000-0000-0000-000000000000',
  id,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- 7e. Classmates in past section 2 (students 31–40)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((32 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3003-0000-0000-0000-000000000000',
  ('5eed2' || lpad((30 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 10) AS g(i)
ON CONFLICT DO NOTHING;

-- 7f. student.test — current enrollment (section 5eed3004, active)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  '5eed4043-0000-0000-0000-000000000000',
  '5eed3004-0000-0000-0000-000000000000',
  id,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- 7g. Classmates in current section (students 41–50)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((43 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3004-0000-0000-0000-000000000000',
  ('5eed2' || lpad((40 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM generate_series(1, 10) AS g(i)
ON CONFLICT DO NOTHING;

-- ── 8. Sessions and events ───────────────────────────────────
-- NOT idempotent (uses gen_random_uuid). Run dev_teardown.sql before re-seeding.
DO $$
DECLARE
  v_adviser_id      uuid;
  v_student_id      uuid;
  v_time_in         uuid;
  v_time_out        uuid;
  v_manual_src      uuid;
  v_closed          uuid;
  v_open            uuid;
  v_voided          uuid;
  i                 int;
  d                 int;
  v_enr_id          uuid;
  v_session_id      uuid;
  v_start           timestamptz;
  v_end             timestamptz;
  v_base            timestamptz := TIMESTAMPTZ '2025-08-25 08:00:00+08';
  v_past1_base      timestamptz := TIMESTAMPTZ '2023-09-04 08:00:00+08';
  v_past2_base      timestamptz := TIMESTAMPTZ '2024-01-22 08:00:00+08';
BEGIN
  SELECT id INTO v_adviser_id FROM auth.users WHERE email = 'adviser.test@up.edu.ph';
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'student.test@up.edu.ph';

  SELECT attendance_event_type_id   INTO v_time_in  FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed FROM attendance_session_status WHERE code = 'closed';
  SELECT attendance_session_status_id INTO v_open   FROM attendance_session_status WHERE code = 'open';
  SELECT attendance_session_status_id INTO v_voided FROM attendance_session_status WHERE code = 'voided';

  -- ── 8a. adviser.test's 20 students: 8 closed sessions each ─
  FOR i IN 1..20 LOOP
    v_enr_id := ('5eed4' || lpad(i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid;

    FOR d IN 0..7 LOOP
      v_start      := v_base + (d * 7 * INTERVAL '1 day') + (i * INTERVAL '3 minutes');
      v_end        := v_start + INTERVAL '3 hours';
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
      VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

      INSERT INTO attendance_event
        (attendance_event_id, enrollment_id, attendance_session_id,
         attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
      VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start, v_adviser_id);

      INSERT INTO attendance_event
        (attendance_event_id, enrollment_id, attendance_session_id,
         attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
      VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end, v_adviser_id);
    END LOOP;

    -- 1 open session for first 8 students (so adviser dashboard has active sessions)
    IF i <= 8 THEN
      v_start      := now() - INTERVAL '1 hour' - (i * INTERVAL '4 minutes');
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
      VALUES (v_session_id, v_enr_id, v_open, v_start, NULL);

      INSERT INTO attendance_event
        (attendance_event_id, enrollment_id, attendance_session_id,
         attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
      VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start, v_adviser_id);
    END IF;

    -- 1 voided session for every 5th student
    IF i % 5 = 0 THEN
      v_start      := v_base - INTERVAL '1 day' + (i * INTERVAL '2 minutes');
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at, void_reason)
      VALUES (v_session_id, v_enr_id, v_voided, v_start, NULL, 'Student did not time out before daily cutoff.');
    END IF;
  END LOOP;

  -- ── 8b. student.test — past enrollment 1 (20 closed sessions ≈ 60 hrs) ─
  v_enr_id := '5eed4021-0000-0000-0000-000000000000';
  FOR d IN 0..19 LOOP
    v_start      := v_past1_base + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start,
            '5eed1001-0000-0000-0000-000000000000');

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end,
            '5eed1001-0000-0000-0000-000000000000');
  END LOOP;

  -- ── 8c. student.test — past enrollment 2 (20 closed sessions ≈ 60 hrs) ─
  v_enr_id := '5eed4032-0000-0000-0000-000000000000';
  FOR d IN 0..19 LOOP
    v_start      := v_past2_base + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start,
            '5eed1002-0000-0000-0000-000000000000');

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end,
            '5eed1002-0000-0000-0000-000000000000');
  END LOOP;

  -- ── 8d. student.test — current enrollment (12 closed + 1 open) ─
  v_enr_id := '5eed4043-0000-0000-0000-000000000000';
  FOR d IN 0..11 LOOP
    v_start      := v_base + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start,
            '5eed1001-0000-0000-0000-000000000000');

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end,
            '5eed1001-0000-0000-0000-000000000000');
  END LOOP;

  -- student.test — current open session (timed in ~50 minutes ago)
  v_start      := now() - INTERVAL '50 minutes';
  v_session_id := gen_random_uuid();

  INSERT INTO attendance_session
    (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
  VALUES (v_session_id, v_enr_id, v_open, v_start, NULL);

  INSERT INTO attendance_event
    (attendance_event_id, enrollment_id, attendance_session_id,
     attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
  VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start, v_student_id);

END $$;

-- ── 9. Appeals ───────────────────────────────────────────────

-- 3 appeals from students in adviser.test's section
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
VALUES
  ('5eed7001-0000-0000-0000-000000000000',
   '5eed4003-0000-0000-0000-000000000000',
   '5eed2003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'open'),
   'I was present but my QR scan failed to load on my phone.',
   '2025-09-08 08:10:00+08'),

  ('5eed7002-0000-0000-0000-000000000000',
   '5eed4005-0000-0000-0000-000000000000',
   '5eed2005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'under_review'),
   'My phone battery died. I was present for the full session.',
   '2025-09-15 08:05:00+08'),

  ('5eed7003-0000-0000-0000-000000000000',
   '5eed4007-0000-0000-0000-000000000000',
   '5eed2007-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'approved'),
   'I timed in but forgot to scan out. Please correct my time-out.',
   '2025-09-01 08:00:00+08')
ON CONFLICT (appeal_id) DO NOTHING;

-- 1 open appeal from student.test in their current section
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
SELECT
  '5eed7004-0000-0000-0000-000000000000',
  '5eed4043-0000-0000-0000-000000000000',
  id,
  '5eed1001-0000-0000-0000-000000000000',
  (SELECT appeal_status_id FROM appeal_status WHERE code = 'open'),
  'The QR code was not displaying properly and I could not scan in time.',
  now() - INTERVAL '3 days'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (appeal_id) DO NOTHING;

-- ── 10. Appeal messages ──────────────────────────────────────

-- Messages on the under_review appeal (5eed7002)
INSERT INTO appeal_message (appeal_message_id, appeal_id, sender_user_id, body)
VALUES (
  '5eed8001-0000-0000-0000-000000000000',
  '5eed7002-0000-0000-0000-000000000000',
  '5eed2005-0000-0000-0000-000000000000',
  'Hi Sir/Ma''am, I was present for the entire session. My phone battery died around 8:47 AM. I have a photo of the dead phone screen I can provide.'
)
ON CONFLICT (appeal_message_id) DO NOTHING;

INSERT INTO appeal_message (appeal_message_id, appeal_id, sender_user_id, body)
SELECT
  '5eed8002-0000-0000-0000-000000000000',
  '5eed7002-0000-0000-0000-000000000000',
  id,
  'Thank you for reaching out. I checked the sign-in sheet and you are listed as present. I will update your attendance record shortly.'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (appeal_message_id) DO NOTHING;

-- ── Done ─────────────────────────────────────────────────────
-- Approximate totals seeded:
--   3 terms  |  4 advisers (3 synthetic + adviser.test)
--   4 sections  |  1 geofence
--   51 students (50 synthetic + student.test)  |  ~53 enrollments
--   ~220 attendance sessions  |  ~380 attendance events
--   4 appeals  |  2 appeal messages
