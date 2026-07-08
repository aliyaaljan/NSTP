-- ============================================================
-- NSTP Dev Seed v5  —  dev_seed.sql
--
-- Purpose : Populate realistic dashboard data for local development.
-- Run in  : Supabase SQL editor (Dashboard → SQL editor)
-- Run AFTER: npm run seed-auth-users  (creates auth.users rows for the 4 fake accounts)
-- Run AFTER: dev_teardown.sql if re-seeding over existing data.
--
-- All seeded PKs (except real people's auth-linked accounts) begin with '5eed'.
-- The teardown script uses this prefix.
--
-- NOT fully idempotent — session/event generation uses gen_random_uuid().
-- Run dev_teardown.sql before re-seeding.
--
-- v5 changes from v4:
--   - Every term is now 2nd-semester only (NSTP 2 only; no NSTP 1 anywhere in seed data).
--     Since course_code is derived from term.semester, this also gives "1 class per
--     facilitator per academic year" for free — no schema/constraint change needed,
--     `uq_section_adviser_term` is still per-term as documented.
--   - No ROTC in seed data — only CWTS and LTS components.
--   - Adds 2 real team-member accounts as facilitators with rich class history
--     (rblopez@up.edu.ph — frontend dev for the facilitator role; jbtulic@up.edu.ph —
--     backend dev), plus 4 real team-member accounts as students in adviser.test's
--     active class (slimbaro, jlrabang, atmendoza5, apvalido). These blocks are
--     written as INSERT ... SELECT ... FROM auth.users WHERE email = '...' so they
--     silently produce zero rows (no error) on a fresh backend where these specific
--     people haven't logged in yet — this file stays safe to run for any dev.
--   - Every class roster gets an hour-tier spread (0%, 20%, 40%, 60%, 80%, 100%, 115%
--     of the 60-hour requirement) by student index, so progress bars/colors vary
--     across every section, not just one flagship class.
--
-- Approx totals: 5 terms (4 past + 1 active, all 2nd-semester) | 9 facilitators
-- (adviser.test + 6 synthetic + rblopez + jbtulic, real-account ones conditional)
-- 27 sections | 4 geofences | ~180 synthetic + real student enrollments
-- ~1600 sessions | ~3200 events | 6 appeals | 2 appeal messages | 9 form requirements
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
-- All 2nd-semester only. NSTP level is derived from term.semester
-- (lib/admin/class-provision.ts), so restricting to 'second' guarantees
-- NSTP 2 everywhere and 1 class/facilitator/year (only 1 term per year exists).
INSERT INTO term (term_id, name, school_year, semester, start_date, end_date, is_active) VALUES
  ('5eed0001-0000-0000-0000-000000000000', '2nd Semester AY 2021-2022', '2021-2022', 'second', '2022-01-10', '2022-05-27', false),
  ('5eed0002-0000-0000-0000-000000000000', '2nd Semester AY 2022-2023', '2022-2023', 'second', '2023-01-16', '2023-05-31', false),
  ('5eed0003-0000-0000-0000-000000000000', '2nd Semester AY 2023-2024', '2023-2024', 'second', '2024-01-15', '2024-05-31', false),
  ('5eed0004-0000-0000-0000-000000000000', '2nd Semester AY 2024-2025', '2024-2025', 'second', '2025-01-13', '2025-05-30', false),
  ('5eed0005-0000-0000-0000-000000000000', '2nd Semester AY 2025-2026', '2025-2026', 'second', '2026-01-12', '2026-05-29', true)
ON CONFLICT DO NOTHING;

-- -- 2. Real team-member facilitator accounts (optional) -----
-- No-ops (0 rows updated) if these people haven't logged in on a given backend yet.
-- rblopez: frontend dev for the facilitator role — LTS, needs full variety like adviser.test.
UPDATE app_user SET
  role_id           = (SELECT role_id FROM role WHERE code = 'adviser'),
  college_id        = (SELECT college_id FROM college WHERE code = 'CAC'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'LTS'),
  partnership_type  = NULL
WHERE email = 'rblopez@up.edu.ph';

-- jbtulic: backend dev — CWTS, own classes + history.
UPDATE app_user SET
  role_id           = (SELECT role_id FROM role WHERE code = 'adviser'),
  college_id        = (SELECT college_id FROM college WHERE code = 'CS'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'CWTS'),
  partnership_type  = 'Community Health and Nutrition'
WHERE email = 'jbtulic@up.edu.ph';

-- apvalido: reset to plain student (was test-promoted to adviser with no class) —
-- he becomes a regular student in adviser.test's active class below.
UPDATE app_user SET
  role_id = (SELECT role_id FROM role WHERE code = 'student'),
  college_id = NULL, nstp_component_id = NULL, partnership_type = NULL
WHERE email = 'apvalido@up.edu.ph';

-- -- 3. Synthetic advisers (no auth.users rows → zero MAU cost) --
-- CWTS/LTS only — no ROTC.
INSERT INTO app_user (app_user_id, role_id, email, full_name, college_id, nstp_component_id, partnership_type) VALUES
  ('5eed1001-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'ana.reyes@up.edu.ph', 'Ana Reyes',
   (SELECT college_id FROM college WHERE code='CAC'), (SELECT nstp_component_id FROM nstp_component WHERE code='LTS'), NULL),
  ('5eed1002-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'ben.santos@up.edu.ph', 'Ben Santos',
   (SELECT college_id FROM college WHERE code='CSS'), (SELECT nstp_component_id FROM nstp_component WHERE code='CWTS'), 'Livelihood and Skills Training'),
  ('5eed1003-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'clara.lim@up.edu.ph', 'Clara Lim',
   (SELECT college_id FROM college WHERE code='CS'), (SELECT nstp_component_id FROM nstp_component WHERE code='CWTS'), 'Environmental Protection'),
  ('5eed1004-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'diego.cruz@up.edu.ph', 'Diego Cruz',
   (SELECT college_id FROM college WHERE code='CAC'), (SELECT nstp_component_id FROM nstp_component WHERE code='LTS'), NULL),
  ('5eed1005-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'elena.torres@up.edu.ph', 'Elena Torres',
   (SELECT college_id FROM college WHERE code='CSS'), (SELECT nstp_component_id FROM nstp_component WHERE code='CWTS'), 'Peace and Human Rights Education'),
  ('5eed1006-0000-0000-0000-000000000000', (SELECT role_id FROM role WHERE code='adviser'), 'fabian.ramos@up.edu.ph', 'Fabian Ramos',
   (SELECT college_id FROM college WHERE code='CAC'), (SELECT nstp_component_id FROM nstp_component WHERE code='LTS'), NULL)
ON CONFLICT (app_user_id) DO NOTHING;

-- -- 4. Fake dev account app_user rows ------------------------
INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'admin'), 'admin.test@up.edu.ph', 'Admin Test Account'
FROM auth.users WHERE email = 'admin.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'adviser'), 'adviser.test@up.edu.ph', 'Adviser Test Account'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'student'), 'student.test@up.edu.ph', 'Student Test Account'
FROM auth.users WHERE email = 'student.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

INSERT INTO app_user (app_user_id, role_id, email, full_name)
SELECT id, (SELECT role_id FROM role WHERE code = 'student'), 'studentleader.test@up.edu.ph', 'Student Leader Test Account'
FROM auth.users WHERE email = 'studentleader.test@up.edu.ph'
ON CONFLICT (app_user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

UPDATE app_user SET
  college_id        = (SELECT college_id FROM college WHERE code = 'CS'),
  nstp_component_id = (SELECT nstp_component_id FROM nstp_component WHERE code = 'CWTS'),
  partnership_type  = 'Disaster Preparedness and Response'
WHERE email = 'adviser.test@up.edu.ph';

-- -- 5. Sections ------------------------------------------------
-- Always-created sections: adviser.test + the 6 synthetic advisers (18 sections).
-- All NSTP 2 (derived from 2nd-semester-only terms above). No ROTC.
INSERT INTO section (section_id, term_id, adviser_user_id, course_code, section_status_id, required_hour_total) VALUES
  -- adviser.test (CS/CWTS) — 4 past + the shared active testing class
  ('5eed3011-0000-0000-0000-000000000000','5eed0001-0000-0000-0000-000000000000',(SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),'NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3012-0000-0000-0000-000000000000','5eed0002-0000-0000-0000-000000000000',(SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),'NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3013-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000',(SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),'NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='archived'),60),
  ('5eed3014-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000',(SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),'NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='archived'),60),
  ('5eed3015-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000',(SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),'NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='active'),60),
  -- Ana Reyes (CAC/LTS) — history + a draft class this year
  ('5eed3041-0000-0000-0000-000000000000','5eed0002-0000-0000-0000-000000000000','5eed1001-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3042-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000','5eed1001-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3043-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','5eed1001-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='draft'),60),
  -- Ben Santos (CSS/CWTS) — history only, no class this year
  ('5eed3051-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000','5eed1002-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='archived'),60),
  ('5eed3052-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000','5eed1002-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='archived'),60),
  -- Clara Lim (CS/CWTS) — active only, newly onboarded
  ('5eed3061-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','5eed1003-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='active'),60),
  -- Diego Cruz (CAC/LTS)
  ('5eed3071-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000','5eed1004-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3072-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','5eed1004-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='active'),60),
  -- Elena Torres (CSS/CWTS) — deepest history (4 classes)
  ('5eed3081-0000-0000-0000-000000000000','5eed0002-0000-0000-0000-000000000000','5eed1005-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3082-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000','5eed1005-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3083-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000','5eed1005-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='completed'),60),
  ('5eed3084-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','5eed1005-0000-0000-0000-000000000000','NSTP 2 CWTS',(SELECT section_status_id FROM section_status WHERE code='active'),60),
  -- Fabian Ramos (CAC/LTS) — brand new, draft only
  ('5eed3091-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','5eed1006-0000-0000-0000-000000000000','NSTP 2 LTS',(SELECT section_status_id FROM section_status WHERE code='draft'),60)
ON CONFLICT (section_id) DO NOTHING;

-- Conditional sections for jbtulic (4) and rblopez (5) — INSERT ... SELECT so they
-- silently produce 0 rows if that person hasn't logged into this backend yet.
INSERT INTO section (section_id, term_id, adviser_user_id, course_code, section_status_id, required_hour_total)
SELECT v.section_id::uuid, v.term_id::uuid, u.id, 'NSTP 2 CWTS', (SELECT section_status_id FROM section_status WHERE code = v.status), 60
FROM auth.users u
JOIN (VALUES
  ('5eed3021-0000-0000-0000-000000000000','5eed0002-0000-0000-0000-000000000000','completed'),
  ('5eed3022-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000','completed'),
  ('5eed3023-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000','archived'),
  ('5eed3024-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','active')
) AS v(section_id, term_id, status) ON true
WHERE u.email = 'jbtulic@up.edu.ph'
ON CONFLICT (section_id) DO NOTHING;

INSERT INTO section (section_id, term_id, adviser_user_id, course_code, section_status_id, required_hour_total)
SELECT v.section_id::uuid, v.term_id::uuid, u.id, 'NSTP 2 LTS', (SELECT section_status_id FROM section_status WHERE code = v.status), 60
FROM auth.users u
JOIN (VALUES
  ('5eed3031-0000-0000-0000-000000000000','5eed0001-0000-0000-0000-000000000000','completed'),
  ('5eed3032-0000-0000-0000-000000000000','5eed0002-0000-0000-0000-000000000000','completed'),
  ('5eed3033-0000-0000-0000-000000000000','5eed0003-0000-0000-0000-000000000000','archived'),
  ('5eed3034-0000-0000-0000-000000000000','5eed0004-0000-0000-0000-000000000000','archived'),
  ('5eed3035-0000-0000-0000-000000000000','5eed0005-0000-0000-0000-000000000000','active')
) AS v(section_id, term_id, status) ON true
WHERE u.email = 'rblopez@up.edu.ph'
ON CONFLICT (section_id) DO NOTHING;

-- -- 6. Geofences ------------------------------------------------
INSERT INTO section_geofence (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active) VALUES
  ('5eed3101-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','UP Baguio Main Campus', 16.411100, 120.596600, 300, true),
  ('5eed3102-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','UP Baguio Social Hall',  16.410800, 120.596200, 200, true)
ON CONFLICT (section_geofence_id) DO NOTHING;

INSERT INTO section_geofence (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active)
SELECT '5eed3103-0000-0000-0000-000000000000', '5eed3035-0000-0000-0000-000000000000', 'UP Baguio Gymnasium', 16.412000, 120.597000, 250, true
WHERE EXISTS (SELECT 1 FROM section WHERE section_id = '5eed3035-0000-0000-0000-000000000000')
ON CONFLICT (section_geofence_id) DO NOTHING;

INSERT INTO section_geofence (section_geofence_id, section_id, label, center_latitude, center_longitude, radius_meter, is_active)
SELECT '5eed3104-0000-0000-0000-000000000000', '5eed3024-0000-0000-0000-000000000000', 'UP Baguio Amphitheater', 16.411500, 120.595900, 150, true
WHERE EXISTS (SELECT 1 FROM section WHERE section_id = '5eed3024-0000-0000-0000-000000000000')
ON CONFLICT (section_geofence_id) DO NOTHING;

-- -- 7. Synthetic students + tiered enrollments/sessions --------
-- One reusable helper renders N weekly 3-hr closed sessions for an enrollment.
-- Dropped after use (kept out of the schema).
CREATE OR REPLACE FUNCTION _seed_render_sessions(p_enr uuid, p_n int, p_base timestamptz, p_offset_min int, p_adviser uuid)
RETURNS void AS $$
DECLARE
  v_time_in    uuid := (SELECT attendance_event_type_id FROM attendance_event_type WHERE code = 'time_in');
  v_time_out   uuid := (SELECT attendance_event_type_id FROM attendance_event_type WHERE code = 'time_out');
  v_manual_src uuid := (SELECT attendance_event_source_id FROM attendance_event_source WHERE code = 'adviser_manual');
  v_closed     uuid := (SELECT attendance_session_status_id FROM attendance_session_status WHERE code = 'closed');
  -- Baguio-area landmarks (rotated per session) so seeded events carry realistic locations:
  -- UP Baguio Main Campus, UP Baguio Social Hall, UP Baguio Gymnasium, UP Baguio Amphitheater,
  -- Baguio City Library, Baguio Cathedral, Camp John Hay.
  v_lats numeric[] := ARRAY[16.411100, 16.410800, 16.412000, 16.411500, 16.412300, 16.413600, 16.401500];
  v_lngs numeric[] := ARRAY[120.596600, 120.596200, 120.597000, 120.595900, 120.596000, 120.594100, 120.606700];
  dd int; s timestamptz; e timestamptz; sid uuid; li int; v_lat numeric; v_lng numeric;
BEGIN
  FOR dd IN 0..p_n-1 LOOP
    s := p_base + (dd * 7 * INTERVAL '1 day') + (p_offset_min * INTERVAL '1 minute');
    e := s + INTERVAL '3 hours';
    sid := gen_random_uuid();
    li := (dd % array_length(v_lats, 1)) + 1;
    v_lat := v_lats[li];
    v_lng := v_lngs[li];
    INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (sid, p_enr, v_closed, s, e);
    INSERT INTO attendance_event (attendance_event_id, enrollment_id, attendance_session_id, attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id,
                                   generated_latitude, generated_longitude, generated_accuracy_meter,
                                   scan_latitude, scan_longitude, scan_accuracy_meter)
    VALUES (gen_random_uuid(), p_enr, sid, v_time_in,  v_manual_src, s, p_adviser, v_lat, v_lng, 12.0, v_lat, v_lng, 12.0),
           (gen_random_uuid(), p_enr, sid, v_time_out, v_manual_src, e, p_adviser, v_lat, v_lng, 12.0, v_lat, v_lng, 12.0);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Config-driven roster generation: (section_id, first synthetic index, roster size,
-- enrollment_status, session base date, whether to render sessions). Sections that
-- don't exist (jbtulic's / rblopez's, on a fresh backend) are skipped automatically.
-- Hour tiers (0,4,8,12,16,20,23 sessions × 3h = 0/12/24/36/48/60/69 hrs = 0/20/40/60/80/100/115%
-- of the 60h requirement) cycle by roster index so every class shows varied progress-bar colors.
DO $$
DECLARE
  v_tiers int[] := ARRAY[0,4,8,12,16,20,23];
  cfg RECORD;
  v_adviser_id uuid;
  v_stu int;
  v_idx int;
  v_student_id uuid;
  v_enrollment_id uuid;
  v_tier int;
BEGIN
  FOR cfg IN
    SELECT * FROM (VALUES
      ('5eed3011-0000-0000-0000-000000000000'::uuid,  1, 5,'completed', TIMESTAMPTZ '2022-01-17 00:00:00+00', true),
      ('5eed3012-0000-0000-0000-000000000000'::uuid,  6, 5,'completed', TIMESTAMPTZ '2023-01-23 00:00:00+00', true),
      ('5eed3013-0000-0000-0000-000000000000'::uuid, 11, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3014-0000-0000-0000-000000000000'::uuid, 16, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3015-0000-0000-0000-000000000000'::uuid, 21,10,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3021-0000-0000-0000-000000000000'::uuid, 31, 5,'completed', TIMESTAMPTZ '2023-01-23 00:00:00+00', true),
      ('5eed3022-0000-0000-0000-000000000000'::uuid, 36, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3023-0000-0000-0000-000000000000'::uuid, 41, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3024-0000-0000-0000-000000000000'::uuid, 46,14,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3031-0000-0000-0000-000000000000'::uuid, 60, 5,'completed', TIMESTAMPTZ '2022-01-17 00:00:00+00', true),
      ('5eed3032-0000-0000-0000-000000000000'::uuid, 65, 5,'completed', TIMESTAMPTZ '2023-01-23 00:00:00+00', true),
      ('5eed3033-0000-0000-0000-000000000000'::uuid, 70, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3034-0000-0000-0000-000000000000'::uuid, 75, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3035-0000-0000-0000-000000000000'::uuid, 80,14,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3041-0000-0000-0000-000000000000'::uuid, 94, 5,'completed', TIMESTAMPTZ '2023-01-23 00:00:00+00', true),
      ('5eed3042-0000-0000-0000-000000000000'::uuid, 99, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3043-0000-0000-0000-000000000000'::uuid,104, 5,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', false),
      ('5eed3051-0000-0000-0000-000000000000'::uuid,109, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3052-0000-0000-0000-000000000000'::uuid,114, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3061-0000-0000-0000-000000000000'::uuid,119,10,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3071-0000-0000-0000-000000000000'::uuid,129, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3072-0000-0000-0000-000000000000'::uuid,134,10,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3081-0000-0000-0000-000000000000'::uuid,144, 5,'completed', TIMESTAMPTZ '2023-01-23 00:00:00+00', true),
      ('5eed3082-0000-0000-0000-000000000000'::uuid,149, 5,'completed', TIMESTAMPTZ '2024-01-22 00:00:00+00', true),
      ('5eed3083-0000-0000-0000-000000000000'::uuid,154, 5,'completed', TIMESTAMPTZ '2025-01-20 00:00:00+00', true),
      ('5eed3084-0000-0000-0000-000000000000'::uuid,159,10,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', true),
      ('5eed3091-0000-0000-0000-000000000000'::uuid,169, 5,'active',    TIMESTAMPTZ '2026-01-19 00:00:00+00', false)
    ) AS t(section_id, start_idx, cnt, enr_status, base_date, gen_sessions)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM section WHERE section_id = cfg.section_id) THEN
      CONTINUE; -- jbtulic's / rblopez's section doesn't exist on this backend — skip
    END IF;

    SELECT adviser_user_id INTO v_adviser_id FROM section WHERE section_id = cfg.section_id;

    FOR v_stu IN 1..cfg.cnt LOOP
      v_idx := cfg.start_idx + v_stu - 1;
      v_student_id := ('5eed2' || lpad(v_idx::text,3,'0') || '-0000-0000-0000-000000000000')::uuid;
      v_enrollment_id := ('5eed4' || lpad(v_idx::text,3,'0') || '-0000-0000-0000-000000000000')::uuid;

      INSERT INTO app_user (app_user_id, role_id, email, full_name)
      VALUES (v_student_id, (SELECT role_id FROM role WHERE code='student'),
              'synstudent' || lpad(v_idx::text,3,'0') || '@up.edu.ph',
              'Student ' || lpad(v_idx::text,3,'0'))
      ON CONFLICT (app_user_id) DO NOTHING;

      INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
      VALUES (v_enrollment_id, cfg.section_id, v_student_id,
              (SELECT enrollment_status_id FROM enrollment_status WHERE code = cfg.enr_status))
      ON CONFLICT DO NOTHING;

      IF cfg.gen_sessions THEN
        v_tier := v_tiers[((v_stu - 1) % 7) + 1];
        PERFORM _seed_render_sessions(v_enrollment_id, v_tier, cfg.base_date, v_stu * 2, v_adviser_id);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- -- 8. Named real students in adviser.test's active class (5eed3015) --
-- student.test / studentleader.test always exist (part of the 4 required fake
-- accounts); the 4 named teammates below are optional (INSERT ... SELECT).
DO $$
DECLARE
  v_active_st  uuid := (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'active');
  v_adviser_test uuid := (SELECT id FROM auth.users WHERE email = 'adviser.test@up.edu.ph');
  v_open       uuid := (SELECT attendance_session_status_id FROM attendance_session_status WHERE code = 'open');
  v_voided     uuid := (SELECT attendance_session_status_id FROM attendance_session_status WHERE code = 'voided');
  v_time_in    uuid := (SELECT attendance_event_type_id FROM attendance_event_type WHERE code = 'time_in');
  v_manual_src uuid := (SELECT attendance_event_source_id FROM attendance_event_source WHERE code = 'adviser_manual');
  v_base       CONSTANT timestamptz := TIMESTAMPTZ '2026-01-19 00:00:00+00';
  v_session_id uuid;
  v_start      timestamptz;
BEGIN
  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4901-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, false
  FROM auth.users WHERE email = 'student.test@up.edu.ph'
  ON CONFLICT DO NOTHING;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4902-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, true
  FROM auth.users WHERE email = 'studentleader.test@up.edu.ph'
  ON CONFLICT DO NOTHING;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4903-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, false
  FROM auth.users WHERE email = 'slimbaro@up.edu.ph'
  ON CONFLICT DO NOTHING;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4904-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, false
  FROM auth.users WHERE email = 'jlrabang@up.edu.ph'
  ON CONFLICT DO NOTHING;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4905-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, false
  FROM auth.users WHERE email = 'atmendoza5@up.edu.ph'
  ON CONFLICT DO NOTHING;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id, is_student_leader)
  SELECT '5eed4906-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000', id, v_active_st, false
  FROM auth.users WHERE email = 'apvalido@up.edu.ph'
  ON CONFLICT DO NOTHING;

  -- Tiered hours: student.test 60% | leader 80% | slimbaro 20% | jlrabang 100% |
  -- atmendoza5 0% (fresh) | apvalido 115% (over-render edge case)
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4901-0000-0000-0000-000000000000') THEN
    PERFORM _seed_render_sessions('5eed4901-0000-0000-0000-000000000000', 12, v_base, 60, v_adviser_test);
  END IF;
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4902-0000-0000-0000-000000000000') THEN
    PERFORM _seed_render_sessions('5eed4902-0000-0000-0000-000000000000', 16, v_base, 63, v_adviser_test);
  END IF;
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4903-0000-0000-0000-000000000000') THEN
    PERFORM _seed_render_sessions('5eed4903-0000-0000-0000-000000000000', 4, v_base, 66, v_adviser_test);
  END IF;
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4904-0000-0000-0000-000000000000') THEN
    PERFORM _seed_render_sessions('5eed4904-0000-0000-0000-000000000000', 20, v_base, 69, v_adviser_test);
  END IF;
  -- atmendoza5 (5eed4905): 0 sessions — freshly enrolled
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4906-0000-0000-0000-000000000000') THEN
    PERFORM _seed_render_sessions('5eed4906-0000-0000-0000-000000000000', 23, v_base, 72, v_adviser_test);
  END IF;

  -- studentleader.test: 1 open session (currently timed in)
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4902-0000-0000-0000-000000000000') THEN
    v_start := now() - INTERVAL '45 minutes';
    v_session_id := gen_random_uuid();
    INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4902-0000-0000-0000-000000000000', v_open, v_start, NULL);
    INSERT INTO attendance_event (attendance_event_id, enrollment_id, attendance_session_id, attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id,
                                   generated_latitude, generated_longitude, generated_accuracy_meter, scan_latitude, scan_longitude, scan_accuracy_meter)
    VALUES (gen_random_uuid(), '5eed4902-0000-0000-0000-000000000000', v_session_id, v_time_in, v_manual_src, v_start, v_adviser_test,
            16.411100, 120.596600, 12.0, 16.411100, 120.596600, 12.0); -- UP Baguio Main Campus
  END IF;

  -- synthetic idx 21: 1 open session only (regular student, currently timed in)
  v_start := now() - INTERVAL '20 minutes';
  v_session_id := gen_random_uuid();
  INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
  VALUES (v_session_id, '5eed4021-0000-0000-0000-000000000000', v_open, v_start, NULL);
  INSERT INTO attendance_event (attendance_event_id, enrollment_id, attendance_session_id, attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id,
                                 generated_latitude, generated_longitude, generated_accuracy_meter, scan_latitude, scan_longitude, scan_accuracy_meter)
  VALUES (gen_random_uuid(), '5eed4021-0000-0000-0000-000000000000', v_session_id, v_time_in, v_manual_src, v_start, v_adviser_test,
          16.412300, 120.596000, 12.0, 16.412300, 120.596000, 12.0); -- Baguio City Library

  -- synthetic idx 30: voided session (missed cutoff)
  INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at, void_reason)
  VALUES (gen_random_uuid(), '5eed4030-0000-0000-0000-000000000000', v_voided, v_base - INTERVAL '1 day', NULL, 'Student did not time out before daily cutoff.');

  -- rblopez active class (5eed3035) parity: open + voided
  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4080-0000-0000-0000-000000000000') THEN
    v_start := now() - INTERVAL '30 minutes';
    v_session_id := gen_random_uuid();
    INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at)
    VALUES (v_session_id, '5eed4080-0000-0000-0000-000000000000', v_open, v_start, NULL);
    INSERT INTO attendance_event (attendance_event_id, enrollment_id, attendance_session_id, attendance_event_type_id, attendance_event_source_id, effective_at, recorded_by_user_id,
                                   generated_latitude, generated_longitude, generated_accuracy_meter, scan_latitude, scan_longitude, scan_accuracy_meter)
    VALUES (gen_random_uuid(), '5eed4080-0000-0000-0000-000000000000', v_session_id, v_time_in, v_manual_src,
            v_start, (SELECT id FROM auth.users WHERE email = 'rblopez@up.edu.ph'),
            16.412000, 120.597000, 12.0, 16.412000, 120.597000, 12.0); -- UP Baguio Gymnasium
  END IF;

  IF EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4093-0000-0000-0000-000000000000') THEN
    INSERT INTO attendance_session (attendance_session_id, enrollment_id, attendance_session_status_id, started_at, ended_at, void_reason)
    VALUES (gen_random_uuid(), '5eed4093-0000-0000-0000-000000000000', v_voided, v_base - INTERVAL '1 day', NULL, 'Student did not time out before daily cutoff.');
  END IF;
END $$;

-- -- 9. student.test's 4 extra historical/dropped enrollments ---
-- completed (jbtulic, optional) | archived (Ben Santos) | dropped-in-active (Diego Cruz)
-- | dropped-in-draft (Fabian Ramos, avoids the one-active-enrollment trigger).
DO $$
DECLARE
  v_completed_st uuid := (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'completed');
  v_dropped_st   uuid := (SELECT enrollment_status_id FROM enrollment_status WHERE code = 'dropped');
  v_student_test uuid := (SELECT id FROM auth.users WHERE email = 'student.test@up.edu.ph');
  v_jbtulic      uuid := (SELECT id FROM auth.users WHERE email = 'jbtulic@up.edu.ph');
BEGIN
  IF EXISTS (SELECT 1 FROM section WHERE section_id = '5eed3022-0000-0000-0000-000000000000') THEN
    INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
    VALUES ('5eed4911-0000-0000-0000-000000000000','5eed3022-0000-0000-0000-000000000000', v_student_test, v_completed_st)
    ON CONFLICT DO NOTHING;
    PERFORM _seed_render_sessions('5eed4911-0000-0000-0000-000000000000', 20, TIMESTAMPTZ '2024-01-22 00:00:00+00', 90, v_jbtulic);
  END IF;

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
  VALUES ('5eed4912-0000-0000-0000-000000000000','5eed3052-0000-0000-0000-000000000000', v_student_test, v_completed_st)
  ON CONFLICT DO NOTHING;
  PERFORM _seed_render_sessions('5eed4912-0000-0000-0000-000000000000', 12, TIMESTAMPTZ '2025-01-20 00:00:00+00', 93, '5eed1002-0000-0000-0000-000000000000');

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
  VALUES ('5eed4913-0000-0000-0000-000000000000','5eed3072-0000-0000-0000-000000000000', v_student_test, v_dropped_st)
  ON CONFLICT DO NOTHING;
  PERFORM _seed_render_sessions('5eed4913-0000-0000-0000-000000000000', 8, TIMESTAMPTZ '2026-01-19 00:00:00+00', 96, '5eed1004-0000-0000-0000-000000000000');

  INSERT INTO enrollment (enrollment_id, section_id, student_user_id, enrollment_status_id)
  VALUES ('5eed4914-0000-0000-0000-000000000000','5eed3091-0000-0000-0000-000000000000', v_student_test, v_dropped_st)
  ON CONFLICT DO NOTHING;
  -- 5eed4914 (draft class): 0 sessions, class never started
END $$;

DROP FUNCTION _seed_render_sessions(uuid, int, timestamptz, int, uuid);

-- -- 10. Appeals -------------------------------------------------
-- 3 on adviser.test's active class + 1 from student.test (dropped enrollment).
INSERT INTO appeal (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id, appeal_status_id, reason, requested_time_in) VALUES
  ('5eed7001-0000-0000-0000-000000000000','5eed4022-0000-0000-0000-000000000000','5eed2022-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code='pending'),
   'I was present but my QR scan failed to load on my phone.', '2026-02-09 08:10:00+08'),
  ('5eed7002-0000-0000-0000-000000000000','5eed4024-0000-0000-0000-000000000000','5eed2024-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code='under_review'),
   'My phone battery died during the session. I was present for the full 3 hours.', '2026-02-16 08:05:00+08'),
  ('5eed7003-0000-0000-0000-000000000000','5eed4026-0000-0000-0000-000000000000','5eed2026-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),
   (SELECT appeal_status_id FROM appeal_status WHERE code='approved'),
   'I timed in but forgot to scan out. Please correct my time-out.', '2026-02-02 08:00:00+08')
ON CONFLICT (appeal_id) DO NOTHING;

INSERT INTO appeal (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id, appeal_status_id, reason, requested_time_in)
SELECT '5eed7004-0000-0000-0000-000000000000','5eed4913-0000-0000-0000-000000000000', id,
       '5eed1004-0000-0000-0000-000000000000',
       (SELECT appeal_status_id FROM appeal_status WHERE code='pending'),
       'The QR code was not displaying properly and I could not scan in time.', now() - INTERVAL '3 days'
FROM auth.users WHERE email='student.test@up.edu.ph'
ON CONFLICT (appeal_id) DO NOTHING;

-- 2 on rblopez's active class (parity — she needs the same variety as adviser.test).
INSERT INTO appeal (appeal_id, enrollment_id, requester_user_id, assigned_adviser_user_id, appeal_status_id, reason, requested_time_in)
SELECT v.appeal_id::uuid, v.enrollment_id::uuid, v.requester_id::uuid, u.id,
       (SELECT appeal_status_id FROM appeal_status WHERE code = v.status), v.reason, v.req_time_in::timestamptz
FROM auth.users u
JOIN (VALUES
  ('5eed7011-0000-0000-0000-000000000000','5eed4081-0000-0000-0000-000000000000','5eed2081-0000-0000-0000-000000000000','pending',
   'The QR code kept showing as expired even though I scanned within a minute.', '2026-02-12 08:15:00+08'),
  ('5eed7012-0000-0000-0000-000000000000','5eed4083-0000-0000-0000-000000000000','5eed2083-0000-0000-0000-000000000000','rejected',
   'I was 15 minutes late but the geofence blocked my check-in entirely.', '2026-02-19 08:20:00+08')
) AS v(appeal_id, enrollment_id, requester_id, status, reason, req_time_in) ON true
WHERE u.email = 'rblopez@up.edu.ph'
  AND EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = v.enrollment_id::uuid)
ON CONFLICT (appeal_id) DO NOTHING;

-- -- 11. Appeal messages ------------------------------------------
INSERT INTO appeal_message (appeal_message_id, appeal_id, sender_user_id, body) VALUES
  ('5eed8001-0000-0000-0000-000000000000','5eed7002-0000-0000-0000-000000000000','5eed2024-0000-0000-0000-000000000000',
   'Hi Ma''am/Sir, I was present for the entire session. My phone battery died around 8:47 AM. I can share a photo of the dead screen if needed.'),
  ('5eed8002-0000-0000-0000-000000000000','5eed7002-0000-0000-0000-000000000000',
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'),
   'Thank you for reaching out. I checked the sign-in sheet and you are listed as present. I will update your attendance record shortly.')
ON CONFLICT (appeal_message_id) DO NOTHING;

-- -- 12. Required forms (adviser.test's active class) --------------
INSERT INTO form_requirement (form_requirement_id, section_id, title, description, due_date, is_active, created_by_user_id) VALUES
  ('5eedf001-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Parental Consent / Waiver',
   'Signed parental consent and liability waiver required before joining community activities.', DATE '2026-06-12', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph')),
  ('5eedf002-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Medical Certificate',
   'Certificate of physical fitness from a licensed physician for fieldwork clearance.', DATE '2026-06-19', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph')),
  ('5eedf003-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Module 1 Reflection Paper',
   'One-page reflection on the Module 1 orientation and values formation session.', DATE '2026-06-26', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph')),
  ('5eedf004-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Insurance / Liability Form',
   'Group accident insurance enrollment form for off-campus immersion.', DATE '2026-06-30', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph')),
  ('5eedf005-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Mid-Program Narrative Report',
   'Narrative report summarizing service activities completed at the program midpoint.', DATE '2026-07-15', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph')),
  ('5eedf006-0000-0000-0000-000000000000','5eed3015-0000-0000-0000-000000000000','Final Activity Documentation',
   'Compiled photo documentation and attendance log for all rendered service hours.', DATE '2026-07-25', true,
   (SELECT id FROM auth.users WHERE email='adviser.test@up.edu.ph'))
ON CONFLICT (form_requirement_id) DO NOTHING;

-- 3 on rblopez's active class (parity).
INSERT INTO form_requirement (form_requirement_id, section_id, title, description, due_date, is_active, created_by_user_id)
SELECT v.form_id::uuid, '5eed3035-0000-0000-0000-000000000000', v.title, v.description, v.due::date, true, u.id
FROM auth.users u
JOIN (VALUES
  ('5eedf011-0000-0000-0000-000000000000','Parental Consent / Waiver',
   'Signed parental consent and liability waiver required before joining community activities.', '2026-06-15'),
  ('5eedf012-0000-0000-0000-000000000000','Literacy Kit Acknowledgment Receipt',
   'Signed receipt for literacy teaching materials issued for the term.', '2026-06-22'),
  ('5eedf013-0000-0000-0000-000000000000','Mid-Program Narrative Report',
   'Narrative report summarizing service activities completed at the program midpoint.', '2026-07-15')
) AS v(form_id, title, description, due) ON true
WHERE u.email = 'rblopez@up.edu.ph'
  AND EXISTS (SELECT 1 FROM section WHERE section_id = '5eed3035-0000-0000-0000-000000000000')
ON CONFLICT (form_requirement_id) DO NOTHING;

-- -- 13. Form submissions ------------------------------------------
-- student.test (adviser.test's class): mixed statuses (2 approved, 1 submitted, 1 rejected).
INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
SELECT '5eedf501-0000-0000-0000-000000000000','5eedf001-0000-0000-0000-000000000000','5eed4901-0000-0000-0000-000000000000',
   'submissions/5eed4901-0000-0000-0000-000000000000/5eedf001-0000-0000-0000-000000000000/mock-parental-consent.pdf',
   'parental_consent.pdf','application/pdf',102400,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='approved'), NULL,
   id, TIMESTAMPTZ '2026-06-07 02:00:00+00', TIMESTAMPTZ '2026-06-05 01:30:00+00'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (form_submission_id) DO NOTHING;

INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
SELECT '5eedf502-0000-0000-0000-000000000000','5eedf002-0000-0000-0000-000000000000','5eed4901-0000-0000-0000-000000000000',
   'submissions/5eed4901-0000-0000-0000-000000000000/5eedf002-0000-0000-0000-000000000000/mock-medical-certificate.pdf',
   'medical_certificate.pdf','application/pdf',153600,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='approved'), NULL,
   id, TIMESTAMPTZ '2026-06-12 03:15:00+00', TIMESTAMPTZ '2026-06-10 02:45:00+00'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (form_submission_id) DO NOTHING;

INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
VALUES ('5eedf503-0000-0000-0000-000000000000','5eedf003-0000-0000-0000-000000000000','5eed4901-0000-0000-0000-000000000000',
   'submissions/5eed4901-0000-0000-0000-000000000000/5eedf003-0000-0000-0000-000000000000/mock-reflection-module1.pdf',
   'reflection_module1.pdf','application/pdf',81920,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='submitted'), NULL, NULL, NULL, TIMESTAMPTZ '2026-06-24 05:00:00+00')
ON CONFLICT (form_submission_id) DO NOTHING;

INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
SELECT '5eedf504-0000-0000-0000-000000000000','5eedf004-0000-0000-0000-000000000000','5eed4901-0000-0000-0000-000000000000',
   'submissions/5eed4901-0000-0000-0000-000000000000/5eedf004-0000-0000-0000-000000000000/mock-insurance-form.pdf',
   'insurance_form.pdf','application/pdf',122880,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='rejected'),
   'Wrong form version — please resubmit using the 2026 group insurance template.',
   id, TIMESTAMPTZ '2026-06-23 06:00:00+00', TIMESTAMPTZ '2026-06-22 04:30:00+00'
FROM auth.users WHERE email = 'adviser.test@up.edu.ph'
ON CONFLICT (form_submission_id) DO NOTHING;

-- rblopez's class: 1 approved, 1 submitted (parity).
INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
SELECT '5eedf511-0000-0000-0000-000000000000','5eedf011-0000-0000-0000-000000000000','5eed4081-0000-0000-0000-000000000000',
   'submissions/5eed4081-0000-0000-0000-000000000000/5eedf011-0000-0000-0000-000000000000/mock-parental-consent.pdf',
   'parental_consent.pdf','application/pdf',98304,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='approved'), NULL,
   id, TIMESTAMPTZ '2026-06-10 02:00:00+00', TIMESTAMPTZ '2026-06-08 01:30:00+00'
FROM auth.users WHERE email = 'rblopez@up.edu.ph'
  AND EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4081-0000-0000-0000-000000000000')
ON CONFLICT (form_submission_id) DO NOTHING;

INSERT INTO form_submission (form_submission_id, form_requirement_id, enrollment_id, storage_path, file_name, content_type, file_size_byte, form_submission_status_id, reviewer_comment, reviewed_by_user_id, reviewed_at, submitted_at)
SELECT '5eedf512-0000-0000-0000-000000000000','5eedf012-0000-0000-0000-000000000000','5eed4083-0000-0000-0000-000000000000',
   'submissions/5eed4083-0000-0000-0000-000000000000/5eedf012-0000-0000-0000-000000000000/mock-kit-receipt.pdf',
   'kit_receipt.pdf','application/pdf',61440,
   (SELECT form_submission_status_id FROM form_submission_status WHERE code='submitted'), NULL, NULL, NULL, TIMESTAMPTZ '2026-06-20 04:00:00+00'
WHERE EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = '5eed4083-0000-0000-0000-000000000000')
ON CONFLICT (form_submission_id) DO NOTHING;

-- adviser.test        sees : 2 completed | 2 archived | 1 active class (one per year, all NSTP 2)
-- jbtulic (optional)  sees : 2 completed | 1 archived | 1 active class
-- rblopez (optional)  sees : 2 completed | 2 archived | 1 active class — full parity with adviser.test
-- student.test        sees : 1 completed | 1 archived | 2 dropped | 1 active (adviser.test's class)
--                            + 6 required forms + ~36h rendered (12 closed sessions, 60%)
-- studentleader.test  sees : 1 active enrollment (leader) in adviser.test's class, 48h + open session
-- slimbaro/jlrabang/atmendoza5/apvalido (optional) : 1 active enrollment each in adviser.test's
--                            class, at 20% / 100% / 0% / 115% of the hour requirement
-- admin.test          sees : all of the above (full read via RLS)
