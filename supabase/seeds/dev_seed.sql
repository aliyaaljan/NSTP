-- ============================================================
-- NSTP Dev Seed v4  —  dev_seed.sql
--
-- Purpose : Populate realistic dashboard data for local development.
-- Run in  : Supabase SQL editor (Dashboard → SQL editor)
-- Run AFTER: npm run seed-auth-users  (creates auth.users rows for fake accounts)
-- Run AFTER: dev_teardown.sql if re-seeding over existing data.
--
-- All seeded PKs (except the 4 fake auth accounts whose IDs come from
-- auth.users) begin with '5eed'. The teardown script uses this prefix.
--
-- NOT fully idempotent — session/event DO blocks use gen_random_uuid().
-- Run dev_teardown.sql before re-seeding.
--
-- v4: one class per facilitator per term (uq_section_adviser_term).
-- Every (adviser, term) pair below is unique. The active term is resolved
-- dynamically: if the DB already has an active term it is reused, otherwise
-- 5eed0005 is created.
--
-- Approx totals:
--   4 past terms (+1 active, created only if none exists)
--   3 synthetic advisers | 104 synthetic students
--   9 sections (5 adviser.test + 4 student.test) | 3 geofences
--   110 enrollments | ~1300 sessions | ~2600 events | 4 appeals
-- ============================================================

-- -- 0. Guard ------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.test@up.edu.ph')
  OR NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'studentleader.test@up.edu.ph') THEN
    RAISE EXCEPTION
      E'Fake auth accounts not found.\nRun: npm run seed-auth-users  (then re-run this file)';
  END IF;
END $$;

-- -- 1. Terms ------------------------------------------------
-- 4 past terms; the active term is reused if one already exists.
INSERT INTO term (term_id, name, school_year, semester, start_date, end_date, is_active) VALUES
  ('5eed0001-0000-0000-0000-000000000000', '1st Semester AY 2022-2023', '2022-2023', 'first',  '2022-08-15', '2022-12-16', false),
  ('5eed0002-0000-0000-0000-000000000000', '2nd Semester AY 2022-2023', '2022-2023', 'second', '2023-01-16', '2023-05-31', false),
  ('5eed0003-0000-0000-0000-000000000000', '1st Semester AY 2023-2024', '2023-2024', 'first',  '2023-08-14', '2023-12-22', false),
  ('5eed0004-0000-0000-0000-000000000000', '2nd Semester AY 2023-2024', '2023-2024', 'second', '2024-01-15', '2024-05-31', false)
ON CONFLICT DO NOTHING;

-- Active term: created only when the DB has none (uq_term_single_active).
-- All "active term" references below resolve it dynamically.
INSERT INTO term (term_id, name, school_year, semester, start_date, end_date, is_active)
SELECT '5eed0005-0000-0000-0000-000000000000', '2nd Semester AY 2025-2026', '2025-2026', 'second',
       '2026-01-12', '2026-05-29', true
WHERE NOT EXISTS (SELECT 1 FROM term WHERE is_active);

-- -- 2. Synthetic advisers (no auth.users rows → zero MAU cost) --
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

-- -- 3. Fake account app_user rows ---------------------------
-- UPSERT the role to fix seed-order race (dev may have logged in first, creating
-- the row with the default 'student' role before the seed ran).
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'admin'),
       'admin.test@up.edu.ph', 'Admin Test Account'
FROM auth.users WHERE email = 'admin.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'adviser'),
       'adviser.test@up.edu.ph', 'Adviser Test Account'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'student'),
       'student.test@up.edu.ph', 'Student Test Account'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'student'),
       'studentleader.test@up.edu.ph', 'Student Leader Test Account'
FROM auth.users WHERE email = 'studentleader.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- -- 3b. Facilitator metadata (college / component / partnership) --
-- Mirrors what the facilitators-file import populates.
UPDATE app_user SET
  college_id        = (SELECT college_id FROM college WHERE code = 'CS'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'CWTS'),
  partnership_type  = 'Disaster Preparedness and Response'
WHERE email = 'adviser.test@up.edu.ph';

UPDATE app_user SET
  college_id        = (SELECT college_id FROM college WHERE code = 'CAC'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'LTS')
WHERE app_user_id = '5eed1001-0000-0000-0000-000000000000';  -- Ana Reyes

UPDATE app_user SET
  college_id        = (SELECT college_id FROM college WHERE code = 'CSS'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'LTS')
WHERE app_user_id = '5eed1002-0000-0000-0000-000000000000';  -- Ben Santos

UPDATE app_user SET
  college_id        = (SELECT college_id FROM college WHERE code = 'CS'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'CWTS'),
  partnership_type  = 'Environmental Protection'
WHERE app_user_id = '5eed1003-0000-0000-0000-000000000000';  -- Clara Lim

-- -- 4. Synthetic students ------------------------------------
-- 5eed2001–5eed2075 : enrolled in adviser.test's 5 classes (15 per class)
-- 5eed2076–5eed2104 : classmates in student.test's 4 classes (8+8+8+5)
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT
  ('5eed2' || lpad(g.i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT role_id FROM role WHERE code = 'student'),
  'synstudent' || lpad(g.i::text, 3, '0') || '@up.edu.ph',
  'Student ' || lpad(g.i::text, 3, '0')
FROM generate_series(1, 104) AS g(i)
ON CONFLICT (app_user_id) DO NOTHING;

-- -- 5. Sections ---------------------------------------------
-- One class per (adviser, term) — uq_section_adviser_term.
-- adviser.test : terms 1-4 (2 completed, 2 archived) + THE active class 5eed3031.
-- Ana Reyes    : term 3 (completed) + active term (draft).
-- Ben Santos   : term 4 (archived).
-- Clara Lim    : active term (active).

INSERT INTO section
  (section_id, term_id, adviser_user_id, course_code, section_status_id, required_hour_total)
VALUES
  -- adviser.test: past classes ------------------------------
  ('5eed3011-0000-0000-0000-000000000000', '5eed0001-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3012-0000-0000-0000-000000000000', '5eed0002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3013-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3014-0000-0000-0000-000000000000', '5eed0004-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  -- adviser.test: THE shared active class (QR workflows) -----
  ('5eed3031-0000-0000-0000-000000000000',
   (SELECT term_id FROM term WHERE is_active LIMIT 1),
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 CWTS',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  -- student.test's other classes (synthetic advisers) --------
  ('5eed3051-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 1 CWTS',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3052-0000-0000-0000-000000000000', '5eed0004-0000-0000-0000-000000000000',
   '5eed1002-0000-0000-0000-000000000000',
   'NSTP 1 LTS',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3053-0000-0000-0000-000000000000',
   (SELECT term_id FROM term WHERE is_active LIMIT 1),
   '5eed1003-0000-0000-0000-000000000000',
   'NSTP 2 CWTS',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3054-0000-0000-0000-000000000000',
   (SELECT term_id FROM term WHERE is_active LIMIT 1),
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 2 LTS',
   (SELECT section_status_id FROM section_status WHERE code = 'draft'), 60)

ON CONFLICT (section_id) DO NOTHING;

-- -- 6. Geofences ---------------------------------------------
-- Two on the shared active class (multi-geofence case) + one on Clara's.
INSERT INTO section_geofence
  (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active)
VALUES
  ('5eed3101-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'UP Baguio Main Campus',  16.411100, 120.596600, 300, true),
  ('5eed3102-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'UP Baguio Social Hall',  16.410800, 120.596200, 200, true),
  ('5eed3106-0000-0000-0000-000000000000', '5eed3053-0000-0000-0000-000000000000',
   'UP Baguio Gymnasium',    16.412000, 120.597000, 250, true)
ON CONFLICT (section_geofence_id) DO NOTHING;

-- -- 7. Enrollments -------------------------------------------

-- 7a. adviser.test's past classes — enrollments 5eed4001–5eed4060
--     Students 5eed2001–5eed2060 | 15 per class | student 1 is leader
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad(((s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (ARRAY[
    '5eed3011-0000-0000-0000-000000000000',
    '5eed3012-0000-0000-0000-000000000000',
    '5eed3013-0000-0000-0000-000000000000',
    '5eed3014-0000-0000-0000-000000000000'
  ]::uuid[])[s.sec],
  ('5eed2' || lpad(((s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed'),
  (g.stu = 1)
FROM generate_series(1, 4) AS s(sec)
CROSS JOIN generate_series(1, 15) AS g(stu)
ON CONFLICT DO NOTHING;

-- 7b. adviser.test's active class (5eed3031) — enrollments 5eed4061–5eed4075
--     Students 5eed2061–5eed2075 | leader is studentleader.test (7e), not a synthetic
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad((60 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3031-0000-0000-0000-000000000000',
  ('5eed2' || lpad((60 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active'),
  false
FROM generate_series(1, 15) AS g(stu)
ON CONFLICT DO NOTHING;

-- 7c. student.test — 4 enrollments (one per class)
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT '5eed4231-0000-0000-0000-000000000000', '5eed3051-0000-0000-0000-000000000000', id,
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT '5eed4232-0000-0000-0000-000000000000', '5eed3052-0000-0000-0000-000000000000', id,
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT '5eed4233-0000-0000-0000-000000000000', '5eed3053-0000-0000-0000-000000000000', id,
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'dropped')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT '5eed4234-0000-0000-0000-000000000000', '5eed3054-0000-0000-0000-000000000000', id,
       -- 'dropped' (not 'active'): one-active-enrollment-per-student guard allows
       -- student.test only its CWTS-2526A active enrollment (5eed4236, block 7e).
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'dropped')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- 7d. Classmates in student.test's classes
-- Completed (5eed3051): students 5eed2076–5eed2083, enrollments 5eed4076–5eed4083
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((75 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3051-0000-0000-0000-000000000000',
  ('5eed2' || lpad((75 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Archived (5eed3052): students 5eed2084–5eed2091, enrollments 5eed4084–5eed4091
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((83 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3052-0000-0000-0000-000000000000',
  ('5eed2' || lpad((83 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Active (5eed3053): students 5eed2092–5eed2099, enrollments 5eed4092–5eed4099
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((91 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3053-0000-0000-0000-000000000000',
  ('5eed2' || lpad((91 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Draft (5eed3054): students 5eed2100–5eed2104, enrollments 5eed4100–5eed4104
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((99 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3054-0000-0000-0000-000000000000',
  ('5eed2' || lpad((99 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM generate_series(1, 5) AS g(i)
ON CONFLICT DO NOTHING;

-- -- 7e. studentleader.test + student.test in shared class CWTS-2526A --
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  '5eed4235-0000-0000-0000-000000000000',
  '5eed3031-0000-0000-0000-000000000000',
  id,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active'),
  true
FROM auth.users WHERE email = 'studentleader.test@up.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  '5eed4236-0000-0000-0000-000000000000',
  '5eed3031-0000-0000-0000-000000000000',
  id,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active'),
  false
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- -- 8a. Sessions — adviser.test's past classes ---------------
-- Sections 5eed3011–5eed3014, enrollments 5eed4001–5eed4060.
-- Students 1–12 per class: 20 closed sessions (60 hrs).
-- Students 13–15 per class: 10 closed sessions (30 hrs, incomplete).
-- Sessions spaced weekly starting 1 week after each class's term start.
-- Term bases (8 AM Manila = midnight UTC):
--   class 1 (5eed3011, term 1, 2022-08-15): 2022-08-22
--   class 2 (5eed3012, term 2, 2023-01-16): 2023-01-23
--   class 3 (5eed3013, term 3, 2023-08-14): 2023-08-21
--   class 4 (5eed3014, term 4, 2024-01-15): 2024-01-22
DO $$
DECLARE
  v_adviser_id uuid;
  v_time_in    uuid;
  v_time_out   uuid;
  v_manual_src uuid;
  v_closed     uuid;
  v_enr_id     uuid;
  v_session_id uuid;
  v_start      timestamptz;
  v_end        timestamptz;
  v_base       timestamptz;
  v_bases      timestamptz[] := ARRAY[
    TIMESTAMPTZ '2022-08-22 00:00:00+00',
    TIMESTAMPTZ '2023-01-23 00:00:00+00',
    TIMESTAMPTZ '2023-08-21 00:00:00+00',
    TIMESTAMPTZ '2024-01-22 00:00:00+00'
  ];
  v_sec_idx    int;
  v_stu_idx    int;
  v_enr_idx    int;
  v_n_sess     int;
  d            int;
BEGIN
  SELECT id INTO v_adviser_id FROM auth.users WHERE email = 'adviser.test@up.edu.ph';
  SELECT attendance_event_type_id   INTO v_time_in    FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out   FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed   FROM attendance_session_status WHERE code = 'closed';

  FOR v_sec_idx IN 1..4 LOOP
    v_base := v_bases[v_sec_idx];
    FOR v_stu_idx IN 1..15 LOOP
      v_enr_idx := (v_sec_idx - 1) * 15 + v_stu_idx;
      v_enr_id  := ('5eed4' || lpad(v_enr_idx::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid;
      v_n_sess  := CASE WHEN v_stu_idx <= 12 THEN 20 ELSE 10 END;

      FOR d IN 0..v_n_sess - 1 LOOP
        v_start      := v_base + (d * 7 * INTERVAL '1 day') + (v_stu_idx * INTERVAL '3 minutes');
        v_end        := v_start + INTERVAL '3 hours';
        v_session_id := gen_random_uuid();

        INSERT INTO attendance_session
          (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
        VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

        INSERT INTO attendance_event
          (attendance_event_id, enrollment_id, attendance_session_id,
           attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
        VALUES
          (gen_random_uuid(), v_enr_id, v_session_id, v_time_in,  v_manual_src, v_start, v_adviser_id),
          (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end,   v_adviser_id);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- -- 8b. Sessions — adviser.test's active class ----------------
-- Section 5eed3031, enrollments 5eed4061–5eed4075 (base: 2026-01-19 = 8 AM Manila).
-- Each student: 12 closed sessions (36 hrs so far).
-- Student 1 also has 1 open session (currently timed in).
-- Student 15 has 1 voided session (missed cutoff).
DO $$
DECLARE
  v_adviser_id uuid;
  v_time_in    uuid;
  v_time_out   uuid;
  v_manual_src uuid;
  v_closed     uuid;
  v_open       uuid;
  v_voided     uuid;
  v_enr_id     uuid;
  v_session_id uuid;
  v_start      timestamptz;
  v_end        timestamptz;
  v_base       CONSTANT timestamptz := TIMESTAMPTZ '2026-01-19 00:00:00+00';
  v_stu_idx    int;
  d            int;
BEGIN
  SELECT id INTO v_adviser_id FROM auth.users WHERE email = 'adviser.test@up.edu.ph';
  SELECT attendance_event_type_id   INTO v_time_in    FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out   FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed   FROM attendance_session_status WHERE code = 'closed';
  SELECT attendance_session_status_id INTO v_open     FROM attendance_session_status WHERE code = 'open';
  SELECT attendance_session_status_id INTO v_voided   FROM attendance_session_status WHERE code = 'voided';

  FOR v_stu_idx IN 1..15 LOOP
    v_enr_id := ('5eed4' || lpad((60 + v_stu_idx)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid;

    -- 12 closed sessions
    FOR d IN 0..11 LOOP
      v_start      := v_base + (d * 7 * INTERVAL '1 day') + (v_stu_idx * INTERVAL '3 minutes');
      v_end        := v_start + INTERVAL '3 hours';
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
      VALUES (v_session_id, v_enr_id, v_closed, v_start, v_end);

      INSERT INTO attendance_event
        (attendance_event_id, enrollment_id, attendance_session_id,
         attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
      VALUES
        (gen_random_uuid(), v_enr_id, v_session_id, v_time_in,  v_manual_src, v_start, v_adviser_id),
        (gen_random_uuid(), v_enr_id, v_session_id, v_time_out, v_manual_src, v_end,   v_adviser_id);
    END LOOP;

    -- Student 1: 1 open session (currently timed in)
    IF v_stu_idx = 1 THEN
      v_start      := now() - INTERVAL '1 hour';
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
      VALUES (v_session_id, v_enr_id, v_open, v_start, NULL);

      INSERT INTO attendance_event
        (attendance_event_id, enrollment_id, attendance_session_id,
         attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
      VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start, v_adviser_id);
    END IF;

    -- Student 15: 1 voided session (did not time out before cutoff)
    IF v_stu_idx = 15 THEN
      v_start      := v_base - INTERVAL '1 day';
      v_session_id := gen_random_uuid();

      INSERT INTO attendance_session
        (attendance_session_id, enrollment_id, attendance_session_status_id,
         started_at, ended_at, void_reason)
      VALUES (v_session_id, v_enr_id, v_voided, v_start, NULL,
              'Student did not time out before daily cutoff.');
    END IF;
  END LOOP;
END $$;

-- -- 8c. Sessions — student.test ------------------------------
-- Completed class (5eed4231, term 3, adviser: Ana Reyes): 20 closed sessions = 60 hrs
-- Archived class  (5eed4232, term 4, adviser: Ben Santos): 20 closed sessions = 60 hrs
-- Dropped class   (5eed4233, active term, adviser: Clara Lim): 12 closed + 1 open
-- Draft class     (5eed4234): no sessions (pre-enrolled, class not started)
DO $$
DECLARE
  v_student_id uuid;
  v_time_in    uuid;
  v_time_out   uuid;
  v_manual_src uuid;
  v_closed     uuid;
  v_open       uuid;
  v_session_id uuid;
  v_start      timestamptz;
  v_end        timestamptz;
  d            int;
BEGIN
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'student.test@up.edu.ph';
  SELECT attendance_event_type_id   INTO v_time_in    FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out   FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed   FROM attendance_session_status WHERE code = 'closed';
  SELECT attendance_session_status_id INTO v_open     FROM attendance_session_status WHERE code = 'open';

  -- Completed class: 20 closed sessions (term 3 base: 2023-08-21)
  FOR d IN 0..19 LOOP
    v_start      := TIMESTAMPTZ '2023-08-21 00:00:00+00' + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4231-0000-0000-0000-000000000000', v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES
      (gen_random_uuid(), '5eed4231-0000-0000-0000-000000000000', v_session_id,
       v_time_in,  v_manual_src, v_start, '5eed1001-0000-0000-0000-000000000000'),
      (gen_random_uuid(), '5eed4231-0000-0000-0000-000000000000', v_session_id,
       v_time_out, v_manual_src, v_end,   '5eed1001-0000-0000-0000-000000000000');
  END LOOP;

  -- Archived class: 20 closed sessions (term 4 base: 2024-01-22)
  FOR d IN 0..19 LOOP
    v_start      := TIMESTAMPTZ '2024-01-22 00:00:00+00' + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4232-0000-0000-0000-000000000000', v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES
      (gen_random_uuid(), '5eed4232-0000-0000-0000-000000000000', v_session_id,
       v_time_in,  v_manual_src, v_start, '5eed1002-0000-0000-0000-000000000000'),
      (gen_random_uuid(), '5eed4232-0000-0000-0000-000000000000', v_session_id,
       v_time_out, v_manual_src, v_end,   '5eed1002-0000-0000-0000-000000000000');
  END LOOP;

  -- Dropped class: 12 closed sessions (active term base: 2026-01-19)
  FOR d IN 0..11 LOOP
    v_start      := TIMESTAMPTZ '2026-01-19 00:00:00+00' + (d * 7 * INTERVAL '1 day');
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4233-0000-0000-0000-000000000000', v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES
      (gen_random_uuid(), '5eed4233-0000-0000-0000-000000000000', v_session_id,
       v_time_in,  v_manual_src, v_start, '5eed1003-0000-0000-0000-000000000000'),
      (gen_random_uuid(), '5eed4233-0000-0000-0000-000000000000', v_session_id,
       v_time_out, v_manual_src, v_end,   '5eed1003-0000-0000-0000-000000000000');
  END LOOP;

  -- Dropped class: 1 open session (currently timed in ~50 minutes ago)
  v_start      := now() - INTERVAL '50 minutes';
  v_session_id := gen_random_uuid();

  INSERT INTO attendance_session
    (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
  VALUES (v_session_id, '5eed4233-0000-0000-0000-000000000000', v_open, v_start, NULL);

  INSERT INTO attendance_event
    (attendance_event_id, enrollment_id, attendance_session_id,
     attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
  VALUES (gen_random_uuid(), '5eed4233-0000-0000-0000-000000000000', v_session_id,
          v_time_in, v_manual_src, v_start, v_student_id);

END $$;

-- -- 8d. Sessions — studentleader.test + student.test in CWTS-2526A --
-- studentleader.test (5eed4235): 12 closed + 1 open  (leader, currently timed in)
-- student.test in CWTS-2526A   (5eed4236): 12 closed
-- Closed sessions required so both appear on the adviser dashboard.
-- Active term base: 2026-01-19 | source: adviser_manual
DO $$
DECLARE
  v_adviser_id uuid;
  v_time_in    uuid;
  v_time_out   uuid;
  v_manual_src uuid;
  v_closed     uuid;
  v_open       uuid;
  v_session_id uuid;
  v_start      timestamptz;
  v_end        timestamptz;
  v_base       CONSTANT timestamptz := TIMESTAMPTZ '2026-01-19 00:00:00+00';
  v_base_student CONSTANT timestamptz := TIMESTAMPTZ '2026-04-04 00:00:00+00';
  d            int;
BEGIN
  SELECT id INTO v_adviser_id FROM auth.users WHERE email = 'adviser.test@up.edu.ph';
  SELECT attendance_event_type_id   INTO v_time_in    FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out   FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed   FROM attendance_session_status WHERE code = 'closed';
  SELECT attendance_session_status_id INTO v_open     FROM attendance_session_status WHERE code = 'open';

  -- studentleader.test (5eed4235): 12 closed sessions
  FOR d IN 0..11 LOOP
    v_start      := v_base + (d * 7 * INTERVAL '1 day') + INTERVAL '48 minutes';
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4235-0000-0000-0000-000000000000', v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES
      (gen_random_uuid(), '5eed4235-0000-0000-0000-000000000000', v_session_id,
       v_time_in,  v_manual_src, v_start, v_adviser_id),
      (gen_random_uuid(), '5eed4235-0000-0000-0000-000000000000', v_session_id,
       v_time_out, v_manual_src, v_end,   v_adviser_id);
  END LOOP;

  -- studentleader.test (5eed4235): 1 open session (currently timed in)
  v_start      := now() - INTERVAL '45 minutes';
  v_session_id := gen_random_uuid();

  INSERT INTO attendance_session
    (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
  VALUES (v_session_id, '5eed4235-0000-0000-0000-000000000000', v_open, v_start, NULL);

  INSERT INTO attendance_event
    (attendance_event_id, enrollment_id, attendance_session_id,
     attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
  VALUES (gen_random_uuid(), '5eed4235-0000-0000-0000-000000000000', v_session_id,
          v_time_in, v_manual_src, v_start, v_adviser_id);

  -- student.test in CWTS-2526A (5eed4236): 12 closed sessions
  FOR d IN 0..11 LOOP
    v_start      := v_base_student + (d * 7 * INTERVAL '1 day') + INTERVAL '51 minutes';
    v_end        := v_start + INTERVAL '3 hours';
    v_session_id := gen_random_uuid();

    INSERT INTO attendance_session
      (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4236-0000-0000-0000-000000000000', v_closed, v_start, v_end);

    INSERT INTO attendance_event
      (attendance_event_id, enrollment_id, attendance_session_id,
       attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
    VALUES
      (gen_random_uuid(), '5eed4236-0000-0000-0000-000000000000', v_session_id,
       v_time_in,  v_manual_src, v_start, v_adviser_id),
      (gen_random_uuid(), '5eed4236-0000-0000-0000-000000000000', v_session_id,
       v_time_out, v_manual_src, v_end,   v_adviser_id);
  END LOOP;

END $$;

-- -- 9. Appeals -----------------------------------------------
-- 3 appeals from students in adviser.test's active class (5eed3031)
-- Enrollment 5eed4063 → student 5eed2063, etc.
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
VALUES
  ('5eed7001-0000-0000-0000-000000000000',
   '5eed4063-0000-0000-0000-000000000000',
   '5eed2063-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'pending'),
   'I was present but my QR scan failed to load on my phone.',
   '2026-02-09 08:10:00+08'),

  ('5eed7002-0000-0000-0000-000000000000',
   '5eed4065-0000-0000-0000-000000000000',
   '5eed2065-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'under_review'),
   'My phone battery died during the session. I was present for the full 3 hours.',
   '2026-02-16 08:05:00+08'),

  ('5eed7003-0000-0000-0000-000000000000',
   '5eed4067-0000-0000-0000-000000000000',
   '5eed2067-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'approved'),
   'I timed in but forgot to scan out. Please correct my time-out.',
   '2026-02-02 08:00:00+08')
ON CONFLICT (appeal_id) DO NOTHING;

-- 1 open appeal from student.test in Clara Lim's class
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
SELECT
  '5eed7004-0000-0000-0000-000000000000',
  '5eed4233-0000-0000-0000-000000000000',
  id,
  '5eed1003-0000-0000-0000-000000000000',
  (SELECT appeal_status_id FROM appeal_status WHERE code = 'pending'),
  'The QR code was not displaying properly and I could not scan in time.',
  now() - INTERVAL '3 days'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (appeal_id) DO NOTHING;

-- -- 10. Appeal messages --------------------------------------
-- Thread on the under_review appeal (5eed7002)
INSERT INTO appeal_message (appeal_message_id, appeal_id, sender_user_id, body)
VALUES
  ('5eed8001-0000-0000-0000-000000000000',
   '5eed7002-0000-0000-0000-000000000000',
   '5eed2065-0000-0000-0000-000000000000',
   'Hi Ma''am/Sir, I was present for the entire session. My phone battery died around 8:47 AM. I can share a photo of the dead screen if needed.'),
  ('5eed8002-0000-0000-0000-000000000000',
   '5eed7002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'Thank you for reaching out. I checked the sign-in sheet and you are listed as present. I will update your attendance record shortly.')
ON CONFLICT (appeal_message_id) DO NOTHING;

-- -- 11. Required forms (CWTS-2526A) --------------------------
-- 6 section-scoped required forms with deadlines for student.test's active
-- class (5eed3031). created_by = the class's adviser. Templates are upload-only
-- (template_storage_path NULL). PKs use the 5eedf0xx prefix so dev_teardown removes them.
INSERT INTO form_requirement
  (form_requirement_id, section_id, title, description, due_date, is_active, created_by_user_id)
VALUES
  ('5eedf001-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Parental Consent / Waiver',
   'Signed parental consent and liability waiver required before joining community activities.',
   DATE '2026-06-12', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000')),
  ('5eedf002-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Medical Certificate',
   'Certificate of physical fitness from a licensed physician for fieldwork clearance.',
   DATE '2026-06-19', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000')),
  ('5eedf003-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Module 1 Reflection Paper',
   'One-page reflection on the Module 1 orientation and values formation session.',
   DATE '2026-06-26', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000')),
  ('5eedf004-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Insurance / Liability Form',
   'Group accident insurance enrollment form for off-campus immersion.',
   DATE '2026-06-30', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000')),
  ('5eedf005-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Mid-Program Narrative Report',
   'Narrative report summarizing service activities completed at the program midpoint.',
   DATE '2026-07-15', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000')),
  ('5eedf006-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'Final Activity Documentation',
   'Compiled photo documentation and attendance log for all rendered service hours.',
   DATE '2026-07-25', true,
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000'))
ON CONFLICT (form_requirement_id) DO NOTHING;

-- student.test (enrollment 5eed4236) submissions: mixed statuses (2 approved, 1
-- submitted/pending, 1 rejected). 5eedf005/5eedf006 left unsubmitted (missing).
-- storage_path is a mock key (no real object); the dashboard only reads status/title/due_date.
INSERT INTO form_submission
  (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name,
   content_type, file_size_byte, form_submission_status_id,
   reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
VALUES
  ('5eedf501-0000-0000-0000-000000000000', '5eedf001-0000-0000-0000-000000000000',
   '5eed4236-0000-0000-0000-000000000000',
   'submissions/5eed4236-0000-0000-0000-000000000000/5eedf001-0000-0000-0000-000000000000/mock-parental-consent.pdf',
   'parental_consent.pdf', 'application/pdf', 102400,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code = 'approved'),
   NULL, (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000'),
   TIMESTAMPTZ '2026-06-07 02:00:00+00', TIMESTAMPTZ '2026-06-05 01:30:00+00'),
  ('5eedf502-0000-0000-0000-000000000000', '5eedf002-0000-0000-0000-000000000000',
   '5eed4236-0000-0000-0000-000000000000',
   'submissions/5eed4236-0000-0000-0000-000000000000/5eedf002-0000-0000-0000-000000000000/mock-medical-certificate.pdf',
   'medical_certificate.pdf', 'application/pdf', 153600,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code = 'approved'),
   NULL, (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000'),
   TIMESTAMPTZ '2026-06-12 03:15:00+00', TIMESTAMPTZ '2026-06-10 02:45:00+00'),
  ('5eedf503-0000-0000-0000-000000000000', '5eedf003-0000-0000-0000-000000000000',
   '5eed4236-0000-0000-0000-000000000000',
   'submissions/5eed4236-0000-0000-0000-000000000000/5eedf003-0000-0000-0000-000000000000/mock-reflection-module1.pdf',
   'reflection_module1.pdf', 'application/pdf', 81920,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code = 'submitted'),
   NULL, NULL, NULL, TIMESTAMPTZ '2026-06-24 05:00:00+00'),
  ('5eedf504-0000-0000-0000-000000000000', '5eedf004-0000-0000-0000-000000000000',
   '5eed4236-0000-0000-0000-000000000000',
   'submissions/5eed4236-0000-0000-0000-000000000000/5eedf004-0000-0000-0000-000000000000/mock-insurance-form.pdf',
   'insurance_form.pdf', 'application/pdf', 122880,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code = 'rejected'),
   'Wrong form version — please resubmit using the 2026 group insurance template.',
   (SELECT adviser_user_id FROM section WHERE section_id = '5eed3031-0000-0000-0000-000000000000'),
   TIMESTAMPTZ '2026-06-23 06:00:00+00', TIMESTAMPTZ '2026-06-22 04:30:00+00')
ON CONFLICT (form_submission_id) DO NOTHING;

-- adviser.test        sees : 2 completed | 2 archived | 1 active class (one per term)
-- student.test        sees : 1 completed | 1 archived | 2 dropped | 1 active (CWTS-2526A)
--                            + 6 required forms (deadlines Jun 12 – Jul 25 2026; mixed statuses)
--                            + 36h rendered across Apr–Jun 2026 (12 closed sessions)
-- studentleader.test  sees : 1 active enrollment in CWTS-2526A (is_student_leader = true)
-- admin.test          sees : all of the above (full read via RLS)
--
-- Totals (approx):
--   4 past terms (+1 active if none existed) | 7 app_users (3 synthetic advisers + 4 fake accounts)
--   104 synthetic students | 9 sections | 3 geofences | 110 enrollments
--   ~1300 sessions | ~2600 events | 4 appeals | 2 appeal messages
