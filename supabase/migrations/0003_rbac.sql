-- ============================================================
-- NSTP Hours Tracker — RBAC: permission + role_permission tables
--
-- Fine-grained permission catalog and role assignments.
-- Permission codes follow '<resource>.<action>' format.
-- app_has_permission() is used in server routes to gate capabilities.
-- The JWT hook (0004_auth_hook.sql) stamps the full permission list
-- into every token so no DB round-trip is needed at request time.
-- ============================================================

create table public.permission (
  permission_id uuid primary key default gen_random_uuid(),
  code          text not null unique,   -- '<resource>.<action>'
  name          text not null,
  description   text
);

create table public.role_permission (
  role_permission_id uuid primary key default gen_random_uuid(),
  role_id            uuid not null references public.role(role_id) on delete cascade,
  permission_id      uuid not null references public.permission(permission_id) on delete cascade,
  unique (role_id, permission_id)
);

create index role_permission_role_idx       on public.role_permission(role_id);
create index role_permission_permission_idx on public.role_permission(permission_id);

-- ============================================================
-- Permission catalog
-- ============================================================
insert into public.permission (code, name, description) values
  ('user.manage',             'Manage Users',            'Create, deactivate, and view all user accounts'),
  ('role.assign',             'Assign Roles',            'Promote or demote a user''s global role'),
  ('analytics.view',          'View Analytics',          'Access system-wide attendance and completion reports'),
  ('section.manage',          'Manage Sections',         'Create and configure sections and geofences'),
  ('enrollment.manage',       'Manage Enrollments',      'Enroll, drop, or CSV-import students into a section'),
  ('attendance.scan',         'Scan QR Codes',           'Scan a student''s QR code to record a time-in or time-out'),
  ('attendance.correct',      'Correct Attendance',      'Create correction events for a student''s attendance'),
  ('attendance.view_section', 'View Section Attendance', 'Read all attendance records in own sections'),
  ('appeal.resolve',          'Resolve Appeals',         'Approve or reject attendance appeals'),
  ('form.upload',             'Upload Forms',            'Add forms to the section or global forms repository'),
  ('attendance.self',         'View Own Attendance',     'Read own attendance sessions and events'),
  ('appeal.submit',           'Submit Appeals',          'Open a new attendance appeal'),
  ('form.view',               'View Forms',              'Download forms from the repository')
on conflict (code) do nothing;

-- ============================================================
-- Role assignments
-- ============================================================

-- admin: all permissions
insert into public.role_permission (role_id, permission_id)
select r.role_id, p.permission_id
from public.role r, public.permission p
where r.code = 'admin'
on conflict (role_id, permission_id) do nothing;

-- adviser: section + attendance + appeals + forms (not user/role admin)
insert into public.role_permission (role_id, permission_id)
select r.role_id, p.permission_id
from public.role r
join public.permission p on p.code in (
  'section.manage', 'enrollment.manage',
  'attendance.scan', 'attendance.correct', 'attendance.view_section',
  'appeal.resolve', 'form.upload', 'form.view',
  'attendance.self', 'appeal.submit'
)
where r.code = 'adviser'
on conflict (role_id, permission_id) do nothing;

-- student: own attendance, appeals, and forms only
insert into public.role_permission (role_id, permission_id)
select r.role_id, p.permission_id
from public.role r
join public.permission p on p.code in (
  'attendance.self', 'appeal.submit', 'form.view'
)
where r.code = 'student'
on conflict (role_id, permission_id) do nothing;

-- ============================================================
-- RLS — authenticated users can read; all writes are migration/service-role only
-- ============================================================
alter table public.permission      enable row level security;
alter table public.role_permission enable row level security;

create policy permission_read      on public.permission      for select to authenticated using (true);
create policy role_permission_read on public.role_permission for select to authenticated using (true);

-- ============================================================
-- app_has_permission() — RLS / invoker-context helper for capability gating
-- NOTE: keys off auth.uid(), which is NULL under the service-role client.
-- Server routes must gate on the decoded permissions[] JWT claim instead
-- (see lib/auth/role.ts decodeRoleClaim). Reserve this function for RLS policies only.
-- ============================================================
create or replace function public.app_has_permission(p_code text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.app_user u
    join public.role_permission rp on rp.role_id = u.role_id
    join public.permission p       on p.permission_id = rp.permission_id
    where u.app_user_id = auth.uid()
      and p.code = p_code
  );
$$;
-- Supabase grants execute to anon and public separately; revoke both.
revoke execute on function public.app_has_permission(text) from public;
revoke execute on function public.app_has_permission(text) from anon;
grant  execute on function public.app_has_permission(text) to authenticated;
