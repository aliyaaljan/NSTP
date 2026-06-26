-- ============================================================
-- NSTP Dev Teardown  —  dev_teardown.sql
--
-- Removes all rows inserted by dev_seed.sql.
-- Run in: Supabase SQL editor (Dashboard → SQL editor)
--
-- Safe to re-run. Leaves lookup/RBAC tables untouched.
-- After running, you can re-seed with dev_seed.sql.
-- ============================================================

-- -- Children first ------------------------------------------

-- Appeal messages
DELETE FROM appeal_message
WHERE appeal_message_id::text LIKE '5eed%';

-- Appeals (5eed prefix + student.test's dynamic-UUID appeal joined via enrollment)
DELETE FROM appeal
WHERE appeal_id::text LIKE '5eed%';

-- Form submissions then requirements (children before parents; both before
-- enrollment/section deletes, since form_submission → form_requirement → section).
DELETE FROM form_submission
WHERE form_submission_id::text LIKE '5eed%';

DELETE FROM form_requirement
WHERE form_requirement_id::text LIKE '5eed%';

-- attendance_event is append-only — trigger must be disabled for DELETE.
-- This requires superuser / owner access; run in the SQL editor (not via PostgREST).
ALTER TABLE attendance_event DISABLE TRIGGER attendance_event_no_delete;

DELETE FROM attendance_event
WHERE enrollment_id IN (
  SELECT enrollment_id FROM enrollment WHERE enrollment_id::text LIKE '5eed%'
);

ALTER TABLE attendance_event ENABLE TRIGGER attendance_event_no_delete;

-- Attendance sessions
DELETE FROM attendance_session
WHERE enrollment_id IN (
  SELECT enrollment_id FROM enrollment WHERE enrollment_id::text LIKE '5eed%'
);

-- QR tokens (cascade from enrollment, but explicit for clarity)
DELETE FROM qr_current_token
WHERE enrollment_id IN (
  SELECT enrollment_id FROM enrollment WHERE enrollment_id::text LIKE '5eed%'
);

-- Enrollments
DELETE FROM enrollment WHERE enrollment_id::text LIKE '5eed%';

-- Geofences
DELETE FROM section_geofence WHERE section_geofence_id::text LIKE '5eed%';

-- Sections
DELETE FROM section WHERE section_id::text LIKE '5eed%';

-- Synthetic app_user rows (advisers + synthetic students only — 5eed prefix)
-- The 4 fake accounts (admin.test, adviser.test, student.test, studentleader.test)
-- have auth.users UUIDs that do NOT start with 5eed, so they are NOT deleted here.
-- To fully remove the fake accounts, delete their auth.users rows via:
--   Dashboard → Authentication → Users  (or the admin API in seed-auth-users.mjs)
DELETE FROM app_user WHERE app_user_id::text LIKE '5eed%';

-- Terms
DELETE FROM term WHERE term_id::text LIKE '5eed%';

-- -- Done -----------------------------------------------------
-- The 4 fake account app_user rows
-- (admin.test, adviser.test, student.test, studentleader.test)
-- are NOT removed — their auth.users UUIDs don't start with 5eed.
-- They are harmless to leave; this backend is disposable.
-- To remove them completely: Dashboard → Authentication → Users → delete each.
