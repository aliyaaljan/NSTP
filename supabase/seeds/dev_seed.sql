-- ============================================================
-- NSTP Dev Seed v3  —  dev_seed.sql
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
-- Approx totals:
--   5 terms | 3 synthetic advisers | 254 synthetic students
--   20 sections (16 adviser.test + 4 student.test) | 6 geofences
--   260 enrollments | ~3600 sessions | ~7300 events | 4 appeals
-- ============================================================

-- ── 0. Guard ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.test@up.edu.ph')
  OR NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'studentleader.test@up.edu.ph') THEN
    RAISE EXCEPTION
      E'Fake auth accounts not found.\nRun: npm run seed-auth-users  (then re-run this file)';
  END IF;
END $$;

-- ── 1. Terms ────────────────────────────────────────────────
-- 4 past + 1 current active term
INSERT INTO term (term_id, name, school_year, semester, start_date, end_date, is_active) VALUES
  ('5eed0001-0000-0000-0000-000000000000', '1st Semester AY 2022-2023', '2022-2023', 'first',  '2022-08-15', '2022-12-16', false),
  ('5eed0002-0000-0000-0000-000000000000', '2nd Semester AY 2022-2023', '2022-2023', 'second', '2023-01-16', '2023-05-31', false),
  ('5eed0003-0000-0000-0000-000000000000', '1st Semester AY 2023-2024', '2023-2024', 'first',  '2023-08-14', '2023-12-22', false),
  ('5eed0004-0000-0000-0000-000000000000', '2nd Semester AY 2023-2024', '2023-2024', 'second', '2024-01-15', '2024-05-31', false),
  ('5eed0005-0000-0000-0000-000000000000', '1st Semester AY 2025-2026', '2025-2026', 'first',  '2025-08-11', '2025-12-19', true)
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

-- ── 3. Fake account app_user rows ───────────────────────────
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

-- ── 4. Synthetic students ────────────────────────────────────
-- 5eed2001–5eed2225 : enrolled in adviser.test's 15 sections (15 per section)
-- 5eed2226–5eed2254 : classmates in student.test's 4 sections (8+8+8+5)
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT
  ('5eed2' || lpad(g.i::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT role_id FROM role WHERE code = 'student'),
  'synstudent' || lpad(g.i::text, 3, '0') || '@up.edu.ph',
  'Student ' || lpad(g.i::text, 3, '0')
FROM generate_series(1, 254) AS g(i)
ON CONFLICT (app_user_id) DO NOTHING;

-- ── 5. Sections ─────────────────────────────────────────────

INSERT INTO section
  (section_id, term_id, adviser_user_id, course_code, name, section_status_id, required_hour_total)
VALUES
  -- adviser.test: 5 completed sections ─────────────────────
  ('5eed3011-0000-0000-0000-000000000000', '5eed0001-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS', 'CWTS-2223A',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3012-0000-0000-0000-000000000000', '5eed0002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS', 'CWTS-2223B',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3013-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS', 'LTS-2324A',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3014-0000-0000-0000-000000000000', '5eed0004-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS', 'LTS-2324B',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3015-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS', 'CWTS-2324A',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  -- adviser.test: 5 archived sections (completed, then archived) ─
  ('5eed3021-0000-0000-0000-000000000000', '5eed0001-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS', 'LTS-2223A',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3022-0000-0000-0000-000000000000', '5eed0002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS', 'LTS-2223B',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3023-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS', 'CWTS-2324B',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3024-0000-0000-0000-000000000000', '5eed0004-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 CWTS', 'CWTS-2324C',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3025-0000-0000-0000-000000000000', '5eed0002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 1 LTS', 'LTS-2223C',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  -- adviser.test: 5 active sections (current term) ──────────
  ('5eed3031-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 CWTS', 'CWTS-2526A',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3032-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 CWTS', 'CWTS-2526B',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3033-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 LTS', 'LTS-2526A',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3034-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 LTS', 'LTS-2526B',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3035-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 CWTS', 'CWTS-2526C',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  -- adviser.test: 1 draft section ───────────────────────────
  ('5eed3041-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'NSTP 2 LTS', 'LTS-2526C',
   (SELECT section_status_id FROM section_status WHERE code = 'draft'), 60),

  -- student.test: 4 sections advised by synthetic advisers ──
  ('5eed3051-0000-0000-0000-000000000000', '5eed0003-0000-0000-0000-000000000000',
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 1 CWTS', 'CWTS-2324D',
   (SELECT section_status_id FROM section_status WHERE code = 'completed'), 60),

  ('5eed3052-0000-0000-0000-000000000000', '5eed0004-0000-0000-0000-000000000000',
   '5eed1002-0000-0000-0000-000000000000',
   'NSTP 1 LTS', 'LTS-2324C',
   (SELECT section_status_id FROM section_status WHERE code = 'archived'), 60),

  ('5eed3053-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   '5eed1003-0000-0000-0000-000000000000',
   'NSTP 2 CWTS', 'CWTS-2526D',
   (SELECT section_status_id FROM section_status WHERE code = 'active'), 60),

  ('5eed3054-0000-0000-0000-000000000000', '5eed0005-0000-0000-0000-000000000000',
   '5eed1001-0000-0000-0000-000000000000',
   'NSTP 2 LTS', 'LTS-2526D',
   (SELECT section_status_id FROM section_status WHERE code = 'draft'), 60)

ON CONFLICT (section_id) DO NOTHING;

-- ── 6. Geofences ─────────────────────────────────────────────
-- adviser.test's 5 active sections + student.test's active section
INSERT INTO section_geofence
  (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active)
VALUES
  ('5eed3101-0000-0000-0000-000000000000', '5eed3031-0000-0000-0000-000000000000',
   'UP Baguio Main Campus',  16.411100, 120.596600, 300, true),
  ('5eed3102-0000-0000-0000-000000000000', '5eed3032-0000-0000-0000-000000000000',
   'UP Baguio Main Campus',  16.411100, 120.596600, 300, true),
  ('5eed3103-0000-0000-0000-000000000000', '5eed3033-0000-0000-0000-000000000000',
   'UP Baguio Social Hall',  16.410800, 120.596200, 200, true),
  ('5eed3104-0000-0000-0000-000000000000', '5eed3034-0000-0000-0000-000000000000',
   'UP Baguio Social Hall',  16.410800, 120.596200, 200, true),
  ('5eed3105-0000-0000-0000-000000000000', '5eed3035-0000-0000-0000-000000000000',
   'UP Baguio Main Campus',  16.411100, 120.596600, 300, true),
  ('5eed3106-0000-0000-0000-000000000000', '5eed3053-0000-0000-0000-000000000000',
   'UP Baguio Gymnasium',    16.412000, 120.597000, 250, true)
ON CONFLICT (section_geofence_id) DO NOTHING;

-- ── 7. Enrollments ───────────────────────────────────────────

-- 7a. adviser.test's completed sections — 5eed4001–5eed4075
--     Students 5eed2001–5eed2075 | 15 per section | student 1 is leader
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad(((s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (ARRAY[
    '5eed3011-0000-0000-0000-000000000000',
    '5eed3012-0000-0000-0000-000000000000',
    '5eed3013-0000-0000-0000-000000000000',
    '5eed3014-0000-0000-0000-000000000000',
    '5eed3015-0000-0000-0000-000000000000'
  ]::uuid[])[s.sec],
  ('5eed2' || lpad(((s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed'),
  (g.stu = 1)
FROM generate_series(1, 5) AS s(sec)
CROSS JOIN generate_series(1, 15) AS g(stu)
ON CONFLICT DO NOTHING;

-- 7b. adviser.test's archived sections — 5eed4076–5eed4150
--     Students 5eed2076–5eed2150 | completed enrollment (finished, then archived)
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad((75 + (s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (ARRAY[
    '5eed3021-0000-0000-0000-000000000000',
    '5eed3022-0000-0000-0000-000000000000',
    '5eed3023-0000-0000-0000-000000000000',
    '5eed3024-0000-0000-0000-000000000000',
    '5eed3025-0000-0000-0000-000000000000'
  ]::uuid[])[s.sec],
  ('5eed2' || lpad((75 + (s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed'),
  (g.stu = 1)
FROM generate_series(1, 5) AS s(sec)
CROSS JOIN generate_series(1, 15) AS g(stu)
ON CONFLICT DO NOTHING;

-- 7c. adviser.test's active sections — 5eed4151–5eed4225
--     Students 5eed2151–5eed2225 | student 1 is leader, except in sec 1 (CWTS-2526A)
--     where studentleader.test (5eed4235, §7f) is the designated leader instead.
INSERT INTO enrollment
  (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
SELECT
  ('5eed4' || lpad((150 + (s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (ARRAY[
    '5eed3031-0000-0000-0000-000000000000',
    '5eed3032-0000-0000-0000-000000000000',
    '5eed3033-0000-0000-0000-000000000000',
    '5eed3034-0000-0000-0000-000000000000',
    '5eed3035-0000-0000-0000-000000000000'
  ]::uuid[])[s.sec],
  ('5eed2' || lpad((150 + (s.sec - 1) * 15 + g.stu)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active'),
  (g.stu = 1 AND s.sec != 1)
FROM generate_series(1, 5) AS s(sec)
CROSS JOIN generate_series(1, 15) AS g(stu)
ON CONFLICT DO NOTHING;

-- 7d. student.test — 4 enrollments (one per section)
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
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT '5eed4234-0000-0000-0000-000000000000', '5eed3054-0000-0000-0000-000000000000', id,
       (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT DO NOTHING;

-- 7e. Classmates in student.test's sections
-- Completed (5eed3051): students 5eed2226–5eed2233, enrollments 5eed4241–5eed4248
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((240 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3051-0000-0000-0000-000000000000',
  ('5eed2' || lpad((225 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Archived (5eed3052): students 5eed2234–5eed2241, enrollments 5eed4249–5eed4256
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((248 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3052-0000-0000-0000-000000000000',
  ('5eed2' || lpad((233 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Active (5eed3053): students 5eed2242–5eed2249, enrollments 5eed4257–5eed4264
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((256 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3053-0000-0000-0000-000000000000',
  ('5eed2' || lpad((241 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM generate_series(1, 8) AS g(i)
ON CONFLICT DO NOTHING;

-- Draft (5eed3054): students 5eed2250–5eed2254, enrollments 5eed4265–5eed4269
INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
SELECT
  ('5eed4' || lpad((264 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  '5eed3054-0000-0000-0000-000000000000',
  ('5eed2' || lpad((249 + g.i)::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid,
  (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active')
FROM generate_series(1, 5) AS g(i)
ON CONFLICT DO NOTHING;

-- ── 7f. studentleader.test + student.test in shared section CWTS-2526A ──
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

-- ── 8a. Sessions — adviser.test's completed sections ─────────
-- Sections 5eed3011–5eed3015, enrollments 5eed4001–5eed4075.
-- Students 1–12 per section: 20 closed sessions (60 hrs).
-- Students 13–15 per section: 10 closed sessions (30 hrs, incomplete).
-- Sessions spaced weekly starting 1 week after each section's term start.
-- Term bases (8 AM Manila = midnight UTC):
--   sec 1 (5eed3011, term 1, 2022-08-15): 2022-08-22
--   sec 2 (5eed3012, term 2, 2023-01-16): 2023-01-23
--   sec 3 (5eed3013, term 3, 2023-08-14): 2023-08-21
--   sec 4 (5eed3014, term 4, 2024-01-15): 2024-01-22
--   sec 5 (5eed3015, term 3, 2023-08-14): 2023-08-21
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
    TIMESTAMPTZ '2024-01-22 00:00:00+00',
    TIMESTAMPTZ '2023-08-21 00:00:00+00'
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

  FOR v_sec_idx IN 1..5 LOOP
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

-- ── 8b. Sessions — adviser.test's archived sections ───────────
-- Sections 5eed3021–5eed3025, enrollments 5eed4076–5eed4150.
-- Same session structure as completed sections (archived = finished, then archived).
-- Term bases:
--   sec 1 (5eed3021, term 1): 2022-08-22
--   sec 2 (5eed3022, term 2): 2023-01-23
--   sec 3 (5eed3023, term 3): 2023-08-21
--   sec 4 (5eed3024, term 4): 2024-01-22
--   sec 5 (5eed3025, term 2): 2023-01-23
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
    TIMESTAMPTZ '2024-01-22 00:00:00+00',
    TIMESTAMPTZ '2023-01-23 00:00:00+00'
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

  FOR v_sec_idx IN 1..5 LOOP
    v_base := v_bases[v_sec_idx];
    FOR v_stu_idx IN 1..15 LOOP
      v_enr_idx := 75 + (v_sec_idx - 1) * 15 + v_stu_idx;
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

-- ── 8c. Sessions — adviser.test's active sections ─────────────
-- Sections 5eed3031–5eed3035, enrollments 5eed4151–5eed4225.
-- All term 5 (base: 2025-08-18 = 8 AM Manila).
-- Each student: 12 closed sessions (36 hrs so far).
-- Student 1 of each section also has 1 open session (currently timed in).
-- Student 15 of each section has 1 voided session (missed cutoff).
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
  v_base       CONSTANT timestamptz := TIMESTAMPTZ '2025-08-18 00:00:00+00';
  v_sec_idx    int;
  v_stu_idx    int;
  v_enr_idx    int;
  d            int;
BEGIN
  SELECT id INTO v_adviser_id FROM auth.users WHERE email = 'adviser.test@up.edu.ph';
  SELECT attendance_event_type_id   INTO v_time_in    FROM attendance_event_type   WHERE code = 'time_in';
  SELECT attendance_event_type_id   INTO v_time_out   FROM attendance_event_type   WHERE code = 'time_out';
  SELECT attendance_event_source_id INTO v_manual_src FROM attendance_event_source WHERE code = 'adviser_manual';
  SELECT attendance_session_status_id INTO v_closed   FROM attendance_session_status WHERE code = 'closed';
  SELECT attendance_session_status_id INTO v_open     FROM attendance_session_status WHERE code = 'open';
  SELECT attendance_session_status_id INTO v_voided   FROM attendance_session_status WHERE code = 'voided';

  FOR v_sec_idx IN 1..5 LOOP
    FOR v_stu_idx IN 1..15 LOOP
      v_enr_idx := 150 + (v_sec_idx - 1) * 15 + v_stu_idx;
      v_enr_id  := ('5eed4' || lpad(v_enr_idx::text, 3, '0') || '-0000-0000-0000-000000000000')::uuid;

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

      -- Student 1 of each section: 1 open session (currently timed in)
      IF v_stu_idx = 1 THEN
        v_start      := now() - INTERVAL '1 hour' - (v_sec_idx * INTERVAL '5 minutes');
        v_session_id := gen_random_uuid();

        INSERT INTO attendance_session
          (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
        VALUES (v_session_id, v_enr_id, v_open, v_start, NULL);

        INSERT INTO attendance_event
          (attendance_event_id, enrollment_id, attendance_session_id,
           attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id)
        VALUES (gen_random_uuid(), v_enr_id, v_session_id, v_time_in, v_manual_src, v_start, v_adviser_id);
      END IF;

      -- Student 15 of each section: 1 voided session (did not time out before cutoff)
      IF v_stu_idx = 15 THEN
        v_start      := v_base - INTERVAL '1 day' + (v_sec_idx * INTERVAL '10 minutes');
        v_session_id := gen_random_uuid();

        INSERT INTO attendance_session
          (attendance_session_id, enrollment_id, attendance_session_status_id,
           started_at, ended_at, void_reason)
        VALUES (v_session_id, v_enr_id, v_voided, v_start, NULL,
                'Student did not time out before daily cutoff.');
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ── 8d. Sessions — student.test ──────────────────────────────
-- Completed section (5eed4231, term 3, adviser: Ana Reyes): 20 closed sessions = 60 hrs
-- Archived section  (5eed4232, term 4, adviser: Ben Santos): 20 closed sessions = 60 hrs
-- Active section    (5eed4233, term 5, adviser: Clara Lim):  12 closed + 1 open
-- Draft section     (5eed4234): no sessions (pre-enrolled, section not started)
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

  -- Completed section: 20 closed sessions (term 3 base: 2023-08-21)
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

  -- Archived section: 20 closed sessions (term 4 base: 2024-01-22)
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

  -- Active section: 12 closed sessions (term 5 base: 2025-08-18)
  FOR d IN 0..11 LOOP
    v_start      := TIMESTAMPTZ '2025-08-18 00:00:00+00' + (d * 7 * INTERVAL '1 day');
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

  -- Active section: 1 open session (currently timed in ~50 minutes ago)
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

-- ── 8e. Sessions — studentleader.test + student.test in CWTS-2526A ──
-- studentleader.test (5eed4235): 12 closed + 1 open  (leader, currently timed in)
-- student.test in CWTS-2526A   (5eed4236): 12 closed
-- Closed sessions required so both appear on the adviser dashboard.
-- Term 5 base: 2025-08-18 | source: adviser_manual
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
  v_base       CONSTANT timestamptz := TIMESTAMPTZ '2025-08-18 00:00:00+00';
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
    v_start      := v_base + (d * 7 * INTERVAL '1 day') + INTERVAL '51 minutes';
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

-- ── 9. Appeals ───────────────────────────────────────────────
-- 3 appeals from students in adviser.test's first active section (5eed3031)
-- Enrollment 5eed4151 = sec 1 / stu 1 → student 5eed2151, etc.
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
VALUES
  ('5eed7001-0000-0000-0000-000000000000',
   '5eed4153-0000-0000-0000-000000000000',
   '5eed2153-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'open'),
   'I was present but my QR scan failed to load on my phone.',
   '2025-09-08 08:10:00+08'),

  ('5eed7002-0000-0000-0000-000000000000',
   '5eed4155-0000-0000-0000-000000000000',
   '5eed2155-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'under_review'),
   'My phone battery died during the session. I was present for the full 3 hours.',
   '2025-09-15 08:05:00+08'),

  ('5eed7003-0000-0000-0000-000000000000',
   '5eed4157-0000-0000-0000-000000000000',
   '5eed2157-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code = 'approved'),
   'I timed in but forgot to scan out. Please correct my time-out.',
   '2025-09-01 08:00:00+08')
ON CONFLICT (appeal_id) DO NOTHING;

-- 1 open appeal from student.test in their active section (advised by Clara Lim)
INSERT INTO appeal
  (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id,
   appeal_status_id, reason, requested_time_in)
SELECT
  '5eed7004-0000-0000-0000-000000000000',
  '5eed4233-0000-0000-0000-000000000000',
  id,
  '5eed1003-0000-0000-0000-000000000000',
  (SELECT appeal_status_id FROM appeal_status WHERE code = 'open'),
  'The QR code was not displaying properly and I could not scan in time.',
  now() - INTERVAL '3 days'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (appeal_id) DO NOTHING;

-- ── 10. Appeal messages ──────────────────────────────────────
-- Thread on the under_review appeal (5eed7002)
INSERT INTO appeal_message (appeal_message_id, appeal_id, sender_user_id, body)
VALUES
  ('5eed8001-0000-0000-0000-000000000000',
   '5eed7002-0000-0000-0000-000000000000',
   '5eed2155-0000-0000-0000-000000000000',
   'Hi Ma''am/Sir, I was present for the entire session. My phone battery died around 8:47 AM. I can share a photo of the dead screen if needed.'),
  ('5eed8002-0000-0000-0000-000000000000',
   '5eed7002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph'),
   'Thank you for reaching out. I checked the sign-in sheet and you are listed as present. I will update your attendance record shortly.')
ON CONFLICT (appeal_message_id) DO NOTHING;

-- ── Done ─────────────────────────────────────────────────────
-- adviser.test        sees : 5 completed | 5 archived | 5 active | 1 draft sections
-- student.test        sees : 1 completed | 1 archived | 2 active (incl. CWTS-2526A) | 1 draft
-- studentleader.test  sees : 1 active enrollment in CWTS-2526A (is_student_leader = true)
-- admin.test          sees : all of the above (full read via RLS)
--
-- Totals (approx):
--   5 terms | 7 app_users (3 synthetic advisers + 4 fake accounts)
--   20 sections | 6 geofences | 260 enrollments
--   ~3600 sessions | ~7300 events | 4 appeals | 2 appeal messages
