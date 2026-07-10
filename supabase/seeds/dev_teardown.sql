-- ============================================================
-- NSTP Dev Teardown  —  dev_teardown.sql
--
-- Removes all rows inserted by dev_seed.sql, PLUS any rows the app created
-- against seeded parents (an appeal filed via the UI on a seeded enrollment,
-- a section created via the admin UI for a synthetic adviser, …). Those rows
-- get random UUIDs, so deletion is by linkage to seed entities, not only by
-- the '5eed' PK prefix.
--
-- Run in: Supabase SQL editor (Dashboard → SQL editor)
-- Safe to re-run. Leaves lookup/RBAC tables untouched.
-- After running, you can re-seed with dev_seed.sql.
--
-- v5 note: dev_seed.sql now also gives real team-member accounts (rblopez,
-- jbtulic, etc.) facilitator/student roles and 5eed-prefixed sections/enrollments.
-- This teardown removes those sections/enrollments (5eed-prefixed) same as any
-- synthetic one, but does NOT touch the real accounts' app_user row itself
-- (their app_user_id is their real auth UUID, not 5eed-prefixed) — their role,
-- college, and component fields are left as last set. Re-running dev_seed.sql
-- re-applies those fields and recreates their sections from scratch.
-- ============================================================

-- -- Target sets ----------------------------------------------
-- Seeded sections + app-created sections assigned to synthetic advisers.
CREATE TEMP TABLE _seed_section ON COMMIT DROP AS
SELECT section_id FROM section
WHERE section_id::text LIKE '5eed%'
   OR adviser_user_id::text LIKE '5eed%';

-- Seeded enrollments + app-created enrollments in those sections.
CREATE TEMP TABLE _seed_enrollment ON COMMIT DROP AS
SELECT enrollment_id FROM enrollment
WHERE enrollment_id::text LIKE '5eed%'
   OR section_id IN (SELECT section_id FROM _seed_section);

-- Appeals on those enrollments (or seeded directly).
CREATE TEMP TABLE _seed_appeal ON COMMIT DROP AS
SELECT appeal_id FROM appeal
WHERE appeal_id::text LIKE '5eed%'
   OR enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment);

-- -- Children first ------------------------------------------

-- Appeal attachments (no cascade — must go before appeals)
DELETE FROM appeal_attachment
WHERE appeal_id IN (SELECT appeal_id FROM _seed_appeal);

DELETE FROM appeal_message
WHERE appeal_message_id::text LIKE '5eed%'
   OR appeal_id IN (SELECT appeal_id FROM _seed_appeal);

DELETE FROM appeal
WHERE appeal_id IN (SELECT appeal_id FROM _seed_appeal);

-- Form submissions then requirements (children before parents; both before
-- enrollment/section deletes, since form_submission → form_requirement → section).
DELETE FROM form_submission
WHERE form_submission_id::text LIKE '5eed%'
   OR enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment)
   OR form_requirement_id IN (
        SELECT form_requirement_id FROM form_requirement
        WHERE form_requirement_id::text LIKE '5eed%'
           OR section_id IN (SELECT section_id FROM _seed_section)
      );

DELETE FROM form_requirement
WHERE form_requirement_id::text LIKE '5eed%'
   OR section_id IN (SELECT section_id FROM _seed_section);

-- attendance_event is append-only — trigger must be disabled for DELETE.
-- This requires superuser / owner access; run in the SQL editor (not via PostgREST).
ALTER TABLE attendance_event DISABLE TRIGGER attendance_event_no_delete;

DELETE FROM attendance_event
WHERE enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment);

ALTER TABLE attendance_event ENABLE TRIGGER attendance_event_no_delete;

-- Attendance sessions
DELETE FROM attendance_session
WHERE enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment);

-- QR tokens (cascade from enrollment, but explicit for clarity)
DELETE FROM qr_current_token
WHERE enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment);

-- Enrollments
DELETE FROM enrollment
WHERE enrollment_id IN (SELECT enrollment_id FROM _seed_enrollment);

-- Geofences (own prefix OR app-created rows on a seed-linked section)
DELETE FROM section_geofence
WHERE section_geofence_id::text LIKE '5eed%'
   OR section_id IN (SELECT section_id FROM _seed_section);

-- Sections
DELETE FROM section
WHERE section_id IN (SELECT section_id FROM _seed_section);

-- Role-change audit rows touching synthetic users (either side)
DELETE FROM role_change
WHERE target_user_id::text LIKE '5eed%'
   OR changed_by_user_id::text LIKE '5eed%';

-- Login sessions of synthetic users (none should exist — they can't log in)
DELETE FROM login_session WHERE app_user_id::text LIKE '5eed%';

-- Audit rows whose actor is a synthetic user (FK on actor_user_id)
DELETE FROM audit_log WHERE actor_user_id::text LIKE '5eed%';

-- Synthetic app_user rows (advisers + synthetic students only — 5eed prefix)
-- The 4 fake accounts (admin.test, adviser.test, student.test, studentleader.test)
-- have auth.users UUIDs that do NOT start with 5eed, so they are NOT deleted here.
-- To fully remove the fake accounts, delete their auth.users rows via:
--   Dashboard → Authentication → Users  (or the admin API in seed-auth-users.mjs)
DELETE FROM app_user WHERE app_user_id::text LIKE '5eed%';

-- Terms (holiday rows cascade)
DELETE FROM term WHERE term_id::text LIKE '5eed%';

-- -- Done -----------------------------------------------------
-- The 4 fake account app_user rows
-- (admin.test, adviser.test, student.test, studentleader.test)
-- are NOT removed — their auth.users UUIDs don't start with 5eed.
-- They are harmless to leave; this backend is disposable.
-- To remove them completely: Dashboard → Authentication → Users → delete each.
