-- ============================================================
-- NSTP Hours Tracker — Row Level Security (RLS)
--
-- Model: RLS protects direct client reads (students/advisers querying
-- via the Supabase JS client). All privileged mutations — QR generation/
-- scan, attendance events, corrections, role changes, CSV import — run
-- through Next.js server routes using the SERVICE ROLE key, which bypasses
-- RLS, with authorization enforced in app code. Client-side writes are
-- default-denied except the few self-service policies below.
--
-- Helper functions are SECURITY DEFINER so they bypass RLS (no recursion)
-- and centralize the access logic. The user's role is also stamped into
-- the JWT by custom_access_token_hook (see 0004_auth_hook.sql) so
-- middleware can gate routes without a DB round-trip.
-- ============================================================

-- ============================================================
-- Access-check helpers
-- ============================================================
create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.app_user u
    join public.role r on r.role_id = u.role_id
    where u.app_user_id = auth.uid() and r.code = 'admin'
  );
$$;

create or replace function public.app_can_read_section(p_section_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.app_is_admin()
      or exists (select 1 from public.section s
                 where s.section_id = p_section_id and s.adviser_user_id = auth.uid())
      or exists (select 1 from public.enrollment e
                 where e.section_id = p_section_id and e.student_user_id = auth.uid());
$$;

create or replace function public.app_advises_section(p_section_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.app_is_admin()
      or exists (select 1 from public.section s
                 where s.section_id = p_section_id and s.adviser_user_id = auth.uid());
$$;

create or replace function public.app_can_access_enrollment(p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.app_is_admin()
      or exists (
        select 1 from public.enrollment e
        join public.section s on s.section_id = e.section_id
        where e.enrollment_id = p_enrollment_id
          and (e.student_user_id = auth.uid() or s.adviser_user_id = auth.uid())
      );
$$;

create or replace function public.app_advises_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.app_is_admin()
      or exists (
        select 1 from public.enrollment e
        join public.section s on s.section_id = e.section_id
        where e.student_user_id = p_user_id and s.adviser_user_id = auth.uid()
      );
$$;

create or replace function public.app_can_read_appeal(p_appeal_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.appeal a
    where a.appeal_id = p_appeal_id
      and (a.requester_user_id = auth.uid() or public.app_can_access_enrollment(a.enrollment_id))
  );
$$;

-- Adviser/admin-only resolution check — resolves through enrollment's section.
-- Unlike app_can_access_enrollment(), this excludes the enrolled student.
create or replace function public.app_advises_enrollment(p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.app_is_admin()
      or exists (
        select 1 from public.enrollment e
        join public.section s on s.section_id = e.section_id
        where e.enrollment_id = p_enrollment_id
          and s.adviser_user_id = auth.uid()
      );
$$;

-- ============================================================
-- Lookup tables — readable by any authenticated user
-- ============================================================
alter table role                      enable row level security;
alter table enrollment_status         enable row level security;
alter table attendance_event_type     enable row level security;
alter table attendance_event_source   enable row level security;
alter table attendance_session_status enable row level security;
alter table appeal_status             enable row level security;
alter table section_status            enable row level security;
alter table college                   enable row level security;
alter table program                   enable row level security;
alter table student_classification    enable row level security;
alter table appeal_type               enable row level security;
alter table enlistment_status         enable row level security;
alter table nstp_component             enable row level security;

create policy lookup_read on role                      for select to authenticated using (true);
create policy lookup_read on enrollment_status         for select to authenticated using (true);
create policy lookup_read on attendance_event_type     for select to authenticated using (true);
create policy lookup_read on attendance_event_source   for select to authenticated using (true);
create policy lookup_read on attendance_session_status for select to authenticated using (true);
create policy lookup_read on appeal_status             for select to authenticated using (true);
create policy lookup_read on section_status            for select to authenticated using (true);
create policy lookup_read on college                   for select to authenticated using (true);
create policy lookup_read on program                   for select to authenticated using (true);
create policy lookup_read on student_classification    for select to authenticated using (true);
create policy lookup_read on appeal_type               for select to authenticated using (true);
create policy lookup_read on enlistment_status         for select to authenticated using (true);
create policy lookup_read on nstp_component             for select to authenticated using (true);

-- ============================================================
-- Identity & organization
-- ============================================================
alter table app_user enable row level security;
create policy app_user_read on app_user for select to authenticated
  using (app_user_id = (select auth.uid()) or public.app_is_admin() or public.app_advises_user(app_user_id));

alter table term enable row level security;
create policy term_read on term for select to authenticated using (true);

-- ============================================================
-- Admin can insert, update and delete 
-- ============================================================
create policy term_insert on term
  for insert to authenticated
  with check (public.app_is_admin());

create policy term_update on term
  for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

create policy term_delete on term
  for delete to authenticated
  using (public.app_is_admin());

-- Admin settings — readable by any authenticated user; writes go through the
-- service role (admin-guarded server actions), consistent with the model above.
alter table holiday enable row level security;
create policy holiday_read on holiday for select to authenticated using (true);

alter table system_settings enable row level security;
create policy system_settings_read on system_settings for select to authenticated using (true);

alter table section enable row level security;
create policy section_read on section for select to authenticated
  using (public.app_can_read_section(section_id));

alter table section_geofence enable row level security;
create policy section_geofence_read on section_geofence for select to authenticated
  using (public.app_can_read_section(section_id));

create policy section_geofence_insert on section_geofence 
  for insert to authenticated
  with check (
    public.app_is_admin() 
    or public.app_advises_section(section_id)
  );

create policy section_geofence_update on section_geofence 
  for update to authenticated
  using (
    public.app_is_admin() 
    or public.app_advises_section(section_id)
  )
  with check (
    public.app_is_admin() 
    or public.app_advises_section(section_id)
  );

create policy section_geofence_delete on section_geofence 
  for delete to authenticated
  using (
    public.app_is_admin() 
    or public.app_advises_section(section_id)
  );

alter table enrollment enable row level security;
create policy enrollment_read on enrollment for select to authenticated
  using (student_user_id = (select auth.uid()) or public.app_advises_section(section_id));

-- ============================================================
-- QR — owner or adviser may read their token row
-- ============================================================
alter table qr_current_token enable row level security;
create policy qr_current_token_read on qr_current_token for select to authenticated
  using (public.app_can_access_enrollment(enrollment_id));

-- ============================================================
-- Attendance — scoped to the enrollment; no client writes
-- ============================================================
alter table attendance_session enable row level security;
create policy attendance_session_read on attendance_session for select to authenticated
  using (public.app_can_access_enrollment(enrollment_id));

alter table attendance_event enable row level security;
create policy attendance_event_read on attendance_event for select to authenticated
  using (public.app_can_access_enrollment(enrollment_id));

-- ============================================================
-- Appeals — student raises and reads own; adviser/admin read & resolve
-- ============================================================
alter table appeal enable row level security;
create policy appeal_read on appeal for select to authenticated
  using (requester_user_id = (select auth.uid()) or public.app_can_access_enrollment(enrollment_id));
create policy appeal_insert_self on appeal for insert to authenticated
  with check (
    requester_user_id = (select auth.uid())
    and exists (select 1 from public.enrollment e
                where e.enrollment_id = appeal.enrollment_id and e.student_user_id = (select auth.uid()))
    and resolved_by_user_id is null
    and resolved_at is null
    and resolution_note is null
    and appeal_status_id = (select appeal_status_id from public.appeal_status where code = 'pending')
    and (
      attendance_session_id is null
      or exists (
        select 1 from public.attendance_session s
        where s.attendance_session_id = appeal.attendance_session_id
          and s.enrollment_id = appeal.enrollment_id
      )
    )
  );
-- appeal_resolve_adviser intentionally omitted: adviser resolution (and under-review
-- transitions) go through a server route using the service role key, not a direct
-- client UPDATE.

alter table appeal_message enable row level security;
create policy appeal_message_read on appeal_message for select to authenticated
  using (public.app_can_read_appeal(appeal_id));
create policy appeal_message_insert on appeal_message for insert to authenticated
  with check (sender_user_id = (select auth.uid()) and public.app_can_read_appeal(appeal_id));

-- ============================================================
-- Appeal attachments — student manages own; adviser/admin read (scoped to appeal)
-- ============================================================
alter table appeal_attachment enable row level security;
create policy appeal_attachment_read on appeal_attachment for select to authenticated
  using (public.app_can_read_appeal(appeal_id));
create policy appeal_attachment_insert_self on appeal_attachment for insert to authenticated
  with check (exists (
    select 1 from public.appeal a
    join public.enrollment e on e.enrollment_id = a.enrollment_id
    where a.appeal_id = appeal_attachment.appeal_id and e.student_user_id = (select auth.uid())
  ));
create policy appeal_attachment_delete_own_pending on appeal_attachment for delete to authenticated
  using (exists (
    select 1 from public.appeal a
    join public.enrollment e on e.enrollment_id = a.enrollment_id
    join public.appeal_status ast on ast.appeal_status_id = a.appeal_status_id
    where a.appeal_id = appeal_attachment.appeal_id
      and e.student_user_id = (select auth.uid())
      and ast.code = 'pending'
  ));

-- ============================================================
-- Forms — global (section_id null) visible to all; section forms scoped
-- ============================================================
alter table form enable row level security;
create policy form_read on form for select to authenticated
  using (section_id is null or public.app_can_read_section(section_id));

-- ============================================================
-- Login sessions — owner sees own and may revoke; admin sees all
-- ============================================================
alter table login_session enable row level security;
create policy login_session_read on login_session for select to authenticated
  using (app_user_id = (select auth.uid()) or public.app_is_admin());
-- login_session_revoke intentionally omitted: revocation goes through the service role in
-- lib/auth/session.ts revokeLoginSession(), not a direct client UPDATE.

-- ============================================================
-- Role change audit — target sees own; admin sees all
-- ============================================================
alter table role_change enable row level security;
create policy role_change_read on role_change for select to authenticated
  using (target_user_id = (select auth.uid()) or public.app_is_admin());

-- ============================================================
-- Lock down SECURITY DEFINER helper functions.
-- anon callers have no auth.uid() so these return false anyway,
-- but restricting execute removes them from the public RPC surface.
-- authenticated still gets EXECUTE so RLS policies can call them.
-- ============================================================
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.app_is_admin()',
    'public.app_can_read_section(uuid)',
    'public.app_advises_section(uuid)',
    'public.app_can_access_enrollment(uuid)',
    'public.app_advises_user(uuid)',
    'public.app_can_read_appeal(uuid)',
    'public.app_advises_enrollment(uuid)'
  ] loop
    -- Supabase grants execute to anon and public separately; revoke both.
    execute format('revoke execute on function %s from public;', fn);
    execute format('revoke execute on function %s from anon;', fn);
    execute format('grant  execute on function %s to authenticated;', fn);
  end loop;
end $$;

-- ============================================================
-- Audit log RLS (tables defined in 0001_schema.sql).
--   audit_log: admin sees all; a user sees rows where they are the
--   actor. (auth.uid() wrapped in a select per perf advisor 0003.)
--   Label tables: non-sensitive display config — readable by any
--   authenticated user (closes the RLS-disabled advisor ERROR).
-- The sensitive snapshots in audit_log.old_data/new_data are guarded
-- by audit_log RLS + the security_invoker audit_log_readable view.
-- ============================================================
alter table audit_log         enable row level security;
alter table audit_table_label enable row level security;
alter table audit_field_label enable row level security;

-- Replace the original ad-hoc policies with cleaner, perf-friendly ones.
drop policy if exists "admins can view all audit logs" on audit_log;
drop policy if exists "facilitators view own audit logs" on audit_log;
drop policy if exists audit_log_admin_read on audit_log;
drop policy if exists audit_log_own_read   on audit_log;
drop policy if exists audit_log_read       on audit_log;
-- Single combined SELECT policy (admin OR own) — one permissive policy avoids
-- the multiple-permissive-policies perf lint of two separate SELECT policies.
create policy audit_log_read on audit_log for select to authenticated
  using (public.app_is_admin() or actor_user_id = (select auth.uid()));

drop policy if exists audit_table_label_read on audit_table_label;
drop policy if exists audit_field_label_read on audit_field_label;
create policy audit_table_label_read on audit_table_label for select to authenticated using (true);
create policy audit_field_label_read on audit_field_label for select to authenticated using (true);
