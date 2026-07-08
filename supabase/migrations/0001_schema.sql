-- ============================================================
-- NSTP Hours Tracker — core schema
--
-- Conventions:
--   * snake_case, singular table & column names; no reserved words
--   * primary/foreign keys are *_id, type uuid
--   * booleans: is_* / has_* / can_*
--   * categorical values live in lookup tables joined by *_id
--   * timestamps are timestamptz (store UTC); coords numeric(9,6); ip inet
-- ============================================================

create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "citext";       -- case-insensitive email
create extension if not exists "moddatetime";  -- auto-maintain updated_at

-- ============================================================
-- Lookup tables (controlled vocabularies)
-- ============================================================
create table role (
  role_id     uuid primary key default gen_random_uuid(),
  code        text not null unique,   -- 'admin' | 'adviser' | 'student'
  name        text not null,
  description text
);

create table enrollment_status (
  enrollment_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'active' | 'dropped' | 'completed'
  name text not null
);

create table attendance_event_type (
  attendance_event_type_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'time_in' | 'time_out' | 'void' | 'correction'
  name text not null
);

create table attendance_event_source (
  attendance_event_source_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'qr_scan' | 'self_leader' | 'adviser_manual' | 'system_auto'
  name text not null
);

create table attendance_session_status (
  attendance_session_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'open'|'closed'|'voided'|'corrected'
  name text not null
);

create table appeal_status (
  appeal_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'pending'|'under_review'|'approved'|'rejected'|'withdrawn'
  name text not null
);

create table section_status (
  section_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'draft' | 'active' | 'completed' | 'archived'
  name text not null
);

-- ============================================================
-- Academic org lookups (college → program) + student classification.
-- Captured here from production (originally created ad hoc in the SQL
-- editor). enrollment.program_id / student_classification_id reference
-- these; get_my_students joins them for the facilitator roster view.
-- ============================================================
create table college (
  college_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table program (
  program_id uuid primary key default gen_random_uuid(),
  college_id uuid not null references college(college_id),
  code text not null unique,
  name text not null
);

create table student_classification (
  student_classification_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'freshman' | 'sophomore' | 'junior' | 'senior'
  name text not null
);

create table enlistment_status (
  enlistment_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'ENLISTED' | 'NOT_ENLISTED' | 'CROSS_ENROLLEE'
  name text not null
);

create table appeal_type (
  appeal_type_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table nstp_component (
  nstp_component_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'CWTS' | 'LTS' | 'ROTC'
  name text not null
);

-- ============================================================
-- Identity & organization
-- ============================================================
create table app_user (
  app_user_id    uuid primary key,                    -- = auth.users.id (Supabase)
  role_id        uuid not null references role(role_id),
  email          citext not null unique,
  full_name      text not null,
  student_number text,
  sais_id        text,
  college_id        uuid references college(college_id),
  nstp_component_id uuid references nstp_component(nstp_component_id),
  partnership_type  text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint app_user_email_up_domain check (email ilike '%@up.edu.ph')
);

create table term (
  term_id     uuid primary key default gen_random_uuid(),
  name        text not null,
  school_year text not null,
  semester    text not null,           -- 'first' | 'second' | 'midyear'
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  unique (school_year, semester)
);

create table section (
  section_id          uuid primary key default gen_random_uuid(),
  term_id             uuid not null references term(term_id),
  adviser_user_id     uuid not null references app_user(app_user_id),
  course_code         text not null,
  section_status_id   uuid not null references section_status(section_status_id),
  required_hour_total integer default 60,
  daily_cutoff_time   time default '23:59',  -- auto-void cutoff (Asia/Manila local)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_section_adviser_term unique (adviser_user_id, term_id)
);

create table section_geofence (
  section_geofence_id uuid primary key default gen_random_uuid(),
  section_id          uuid not null references section(section_id) on delete cascade,
  label               text,
  center_latitude     numeric(9,6) not null,
  center_longitude    numeric(9,6) not null,
  radius_meter        integer not null check (radius_meter > 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table enrollment (
  enrollment_id        uuid primary key default gen_random_uuid(),
  section_id           uuid not null references section(section_id) on delete cascade,
  student_user_id      uuid not null references app_user(app_user_id),
  enrollment_status_id uuid not null references enrollment_status(enrollment_status_id),
  is_student_leader    boolean not null default false,
  program_id                uuid references program(program_id),
  student_classification_id uuid references student_classification(student_classification_id),
  enlistment_status_id      uuid references enlistment_status(enlistment_status_id),
  assigned_geofence_id      uuid references section_geofence(section_geofence_id),
  joined_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (section_id, student_user_id)
);

-- ============================================================
-- QR validation state (one row per enrollment, UPSERTed on generation)
-- ============================================================
create table qr_current_token (
  qr_current_token_id uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null unique references enrollment(enrollment_id) on delete cascade,
  current_nonce       text not null,
  generated_at        timestamptz not null default now(),
  expires_at          timestamptz not null,   -- generated_at + 1 minute
  is_consumed         boolean not null default false,
  consumed_at         timestamptz,
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- Attendance
-- ============================================================
create table attendance_session (
  attendance_session_id        uuid primary key default gen_random_uuid(),
  enrollment_id                uuid not null references enrollment(enrollment_id),
  attendance_session_status_id uuid not null references attendance_session_status(attendance_session_status_id),
  started_at                   timestamptz,
  ended_at                     timestamptz,
  duration_minute              integer generated always as
                                 (floor(extract(epoch from (ended_at - started_at)) / 60)::int) stored,
  void_reason                  text,
  is_flagged                   boolean not null default false,   -- advisory flag (e.g. off-site at time-out); session still counts
  flag_reason                  text,                             -- human-readable reason the session was flagged
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- APPEND-ONLY: never UPDATE/DELETE rows; corrections are new inserts with corrects_event_id set
create table attendance_event (
  attendance_event_id        uuid primary key default gen_random_uuid(),
  enrollment_id              uuid not null references enrollment(enrollment_id),
  attendance_session_id      uuid references attendance_session(attendance_session_id),
  attendance_event_type_id   uuid not null references attendance_event_type(attendance_event_type_id),
  attendance_event_source_id uuid not null references attendance_event_source(attendance_event_source_id),
  effective_at               timestamptz not null,
  recorded_at                timestamptz not null default now(),
  recorded_by_user_id        uuid references app_user(app_user_id),
  -- generation snapshot (copied from signed QR token; survives token UPSERT/expiry)
  qr_nonce                   text,
  qr_signature               text,
  generated_at               timestamptz,
  generated_latitude         numeric(9,6),
  generated_longitude        numeric(9,6),
  generated_accuracy_meter   numeric(7,2),
  generated_device_type      text,
  generated_browser          text,
  generated_os               text,
  generated_ip_address       inet,
  -- scan side
  scan_latitude              numeric(9,6),
  scan_longitude             numeric(9,6),
  scan_accuracy_meter        numeric(7,2),
  scanner_device_type        text,
  scanner_browser            text,
  scanner_os                 text,
  scanner_ip_address         inet,
  corrects_event_id          uuid references attendance_event(attendance_event_id),
  note                       text,
  created_at                 timestamptz not null default now()
);

-- One QR nonce can yield at most one event (replay guard)
create unique index attendance_event_qr_nonce_uq
  on attendance_event(qr_nonce) where (qr_nonce is not null);

-- attendance_event is append-only: corrections are new inserts (corrects_event_id).
-- This trigger enforces immutability even for the service-role key.
create or replace function public.block_attendance_event_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'attendance_event is append-only; insert a correcting row with corrects_event_id instead';
end;
$$;
create trigger attendance_event_no_update
  before update on attendance_event
  for each row execute function public.block_attendance_event_mutation();
create trigger attendance_event_no_delete
  before delete on attendance_event
  for each row execute function public.block_attendance_event_mutation();

-- ============================================================
-- Appeals (ticket + threaded messages)
-- ============================================================
create table appeal (
  appeal_id                uuid primary key default gen_random_uuid(),
  enrollment_id            uuid not null references enrollment(enrollment_id),
  attendance_session_id    uuid references attendance_session(attendance_session_id),
  requester_user_id        uuid not null references app_user(app_user_id),
  assigned_adviser_user_id uuid references app_user(app_user_id),
  appeal_status_id         uuid not null references appeal_status(appeal_status_id),
  appeal_type_id           uuid references appeal_type(appeal_type_id),
  requested_time_in        timestamptz,
  requested_time_out       timestamptz,
  reason                   text not null,
  resolution_note          text,
  resolved_by_user_id      uuid references app_user(app_user_id),
  resolved_at              timestamptz,
  storage_path             text,     -- optional supporting-document attachment
  file_name                text,
  content_type             text,
  file_size_byte           bigint,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table appeal_message (
  appeal_message_id uuid primary key default gen_random_uuid(),
  appeal_id         uuid not null references appeal(appeal_id) on delete cascade,
  sender_user_id    uuid not null references app_user(app_user_id),
  body              text not null,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Forms repository (file bytes live in Supabase Storage)
-- ============================================================
create table form (
  form_id             uuid primary key default gen_random_uuid(),
  section_id          uuid references section(section_id) on delete cascade,  -- null = global
  uploaded_by_user_id uuid not null references app_user(app_user_id),
  title               text not null,
  description         text,
  storage_path        text not null,
  file_name           text not null,
  content_type        text,
  file_size_byte      bigint,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- Auth audit / active sessions
-- ============================================================
create table login_session (
  login_session_id uuid primary key default gen_random_uuid(),
  app_user_id      uuid not null references app_user(app_user_id),
  login_at         timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  revoked_at       timestamptz,
  is_active        boolean not null default true,
  device_type      text,
  browser          text,
  os               text,
  ip_address       inet,
  user_agent       text,
  latitude         numeric(9,6),
  longitude        numeric(9,6),
  location_label   text
);

create table role_change (
  role_change_id     uuid primary key default gen_random_uuid(),
  target_user_id     uuid not null references app_user(app_user_id),
  changed_by_user_id uuid not null references app_user(app_user_id),
  old_role_id        uuid references role(role_id),
  new_role_id        uuid not null references role(role_id),
  reason             text,
  created_at         timestamptz not null default now()
);

-- ============================================================
-- Admin settings — academic-calendar holidays + app-wide config.
-- Back the Admin Settings page (holiday CRUD + default NSTP hours).
-- ============================================================
create table holiday (
  holiday_id   uuid primary key default gen_random_uuid(),
  term_id      uuid not null references term(term_id) on delete cascade,
  name         text not null,
  holiday_date date not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (term_id, holiday_date)      -- one holiday entry per date per term
);

-- Key-value store for app-wide settings (e.g. 'default_nstp_hours').
-- Values are jsonb so a setting can hold a scalar or a structured value.
create table system_settings (
  setting_key   text primary key,
  setting_value jsonb not null,
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- Indexes on FKs / hot paths
-- ============================================================
create index app_user_role_idx                on app_user(role_id);
create index enrollment_section_idx           on enrollment(section_id);
create index enrollment_student_idx           on enrollment(student_user_id);
create index section_term_idx                 on section(term_id);
create index section_adviser_idx              on section(adviser_user_id);
create index section_geofence_section_idx     on section_geofence(section_id);
create index attendance_event_enrollment_idx  on attendance_event(enrollment_id);
create index attendance_event_session_idx     on attendance_event(attendance_session_id);
create index attendance_session_enrollment_idx on attendance_session(enrollment_id);
create index appeal_enrollment_idx            on appeal(enrollment_id);
create index appeal_session_idx               on appeal(attendance_session_id);
create index appeal_message_appeal_idx        on appeal_message(appeal_id);
create index form_section_idx                 on form(section_id);
create index holiday_term_idx                  on holiday(term_id);
create index login_session_user_idx           on login_session(app_user_id);

-- Covering indexes for unindexed FK columns (perf advisor lint 0001).
create index appeal_requester_idx             on appeal(requester_user_id);
create index appeal_assigned_adviser_idx      on appeal(assigned_adviser_user_id);
create index appeal_resolved_by_idx           on appeal(resolved_by_user_id);
create index appeal_message_sender_idx        on appeal_message(sender_user_id);
create index attendance_event_recorded_by_idx on attendance_event(recorded_by_user_id);
create index attendance_event_corrects_idx    on attendance_event(corrects_event_id);
create index form_uploaded_by_idx             on form(uploaded_by_user_id);
create index role_change_target_idx           on role_change(target_user_id);
create index role_change_changed_by_idx       on role_change(changed_by_user_id);
create index if not exists appeal_status_idx                on appeal(appeal_status_id);
create index if not exists attendance_event_source_idx      on attendance_event(attendance_event_source_id);
create index if not exists attendance_session_status_idx    on attendance_session(attendance_session_status_id);
create index if not exists role_change_old_role_idx         on role_change(old_role_id);
create index if not exists role_change_new_role_idx         on role_change(new_role_id);
create index if not exists section_status_idx               on section(section_status_id);

-- At most one active term at a time
create unique index if not exists uq_term_single_active
  on term ((is_active)) where is_active;

-- ============================================================
-- updated_at auto-maintenance (moddatetime)
-- ============================================================
create trigger set_app_user_updated_at          before update on app_user
  for each row execute procedure moddatetime(updated_at);
create trigger set_section_updated_at           before update on section
  for each row execute procedure moddatetime(updated_at);
create trigger set_section_geofence_updated_at  before update on section_geofence
  for each row execute procedure moddatetime(updated_at);
create trigger set_enrollment_updated_at        before update on enrollment
  for each row execute procedure moddatetime(updated_at);
create trigger set_qr_current_token_updated_at  before update on qr_current_token
  for each row execute procedure moddatetime(updated_at);
create trigger set_attendance_session_updated_at before update on attendance_session
  for each row execute procedure moddatetime(updated_at);
create trigger set_appeal_updated_at            before update on appeal
  for each row execute procedure moddatetime(updated_at);
create trigger set_form_updated_at              before update on form
  for each row execute procedure moddatetime(updated_at);
create trigger set_holiday_updated_at           before update on holiday
  for each row execute procedure moddatetime(updated_at);
create trigger set_system_settings_updated_at   before update on system_settings
  for each row execute procedure moddatetime(updated_at);

-- ============================================================
-- One active enrollment per student.
-- At most one enrollment per student may have enrollment_status = 'active'.
-- Resolves 'active' by code. Fires for service-role writes too.
-- ============================================================
create or replace function public.enforce_one_active_enrollment()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_active_id uuid;
begin
  select enrollment_status_id into v_active_id
  from enrollment_status where code = 'active';

  -- only guard rows that are (becoming) active
  if new.enrollment_status_id is distinct from v_active_id then
    return new;
  end if;

  if exists (
    select 1 from enrollment e
    where e.student_user_id      = new.student_user_id
      and e.enrollment_status_id = v_active_id
      and e.enrollment_id       <> new.enrollment_id
  ) then
    raise exception
      'student % already has an active enrollment; set the prior enrollment to completed/dropped first',
      new.student_user_id
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_one_active_enrollment on enrollment;
create trigger enforce_one_active_enrollment
  before insert or update on enrollment
  for each row execute function public.enforce_one_active_enrollment();

-- ============================================================
-- Seed data (lookup tables) — idempotent
-- ============================================================
insert into role (code, name, description) values
  ('admin',   'Administrator', 'NSTP office; overall management of sections and accounts'),
  ('adviser', 'Adviser',       'Facilitator/instructor; manages own sections'),
  ('student', 'Student',       'Default role; renders NSTP service')
on conflict (code) do nothing;

insert into enrollment_status (code, name) values
  ('active',    'Active'),
  ('dropped',   'Dropped'),
  ('completed', 'Completed')
on conflict (code) do nothing;

insert into attendance_event_type (code, name) values
  ('time_in',    'Time In'),
  ('time_out',   'Time Out'),
  ('void',       'Void'),
  ('correction', 'Correction')
on conflict (code) do nothing;

insert into attendance_event_source (code, name) values
  ('qr_scan',        'QR Scan'),
  ('self_leader',    'Leader Self-Log'),
  ('adviser_manual', 'Adviser Manual'),
  ('system_auto',    'System Automatic')
on conflict (code) do nothing;

-- Session lifecycle (mutually exclusive). Off-site is an advisory boolean (attendance_session.is_flagged),
-- not a status; "under appeal" is derived from the appeal table. See docs/DECISIONS.md.
insert into attendance_session_status (code, name) values
  ('open',      'Open'),        -- timed in, not yet timed out
  ('closed',    'Closed'),      -- completed (normal time-out or manual add)
  ('voided',    'Voided'),      -- auto-voided at daily cutoff, or manually voided; does not count
  ('corrected', 'Corrected')    -- existing session whose times were adjusted via a correcting event
on conflict (code) do nothing;

insert into appeal_status (code, name) values
  ('pending',      'Pending'),
  ('under_review', 'Under Review'),
  ('approved',     'Approved'),
  ('rejected',     'Rejected'),
  ('withdrawn',    'Withdrawn')
on conflict (code) do nothing;

insert into section_status (code, name) values
  ('draft',     'Draft'),
  ('active',    'Active'),
  ('completed', 'Completed'),
  ('archived',  'Archived')
on conflict (code) do nothing;

insert into college (code, name) values
  ('CAC', 'College of Arts and Communication'),
  ('CS',  'College of Science'),
  ('CSS', 'College of Social Science')
on conflict (code) do nothing;

insert into student_classification (code, name) values
  ('freshman',  'Freshman'),
  ('sophomore', 'Sophomore'),
  ('junior',    'Junior'),
  ('senior',    'Senior')
on conflict (code) do nothing;

-- Program codes use the client's official abbreviated format
insert into program (code, name, college_id) values
  ('BACOM', 'BA Communication',           (select college_id from college where code = 'CAC')),
  ('BALL',  'BA Language and Literature', (select college_id from college where code = 'CAC')),
  ('BFA',   'BA Fine Arts',               (select college_id from college where code = 'CAC')),
  ('CFA',   'Certificate in Fine Arts',   (select college_id from college where code = 'CAC')),
  ('BSBIO', 'BS Biology',                 (select college_id from college where code = 'CS')),
  ('BSCS',  'BS Computer Science',        (select college_id from college where code = 'CS')),
  ('BSMAT', 'BS Mathematics',             (select college_id from college where code = 'CS')),
  ('BSPHY', 'BS Physics',                 (select college_id from college where code = 'CS')),
  ('BASS',  'BA Social Science',          (select college_id from college where code = 'CSS')),
  ('BSME',  'BS Management Economics',    (select college_id from college where code = 'CSS'))
on conflict (code) do nothing;

insert into enlistment_status (code, name) values
  ('ENLISTED',       'Officially Enlisted'),
  ('NOT_ENLISTED',   'Not Officially Enlisted'),
  ('CROSS_ENROLLEE', 'Cross-enrollee')
on conflict (code) do nothing;

insert into appeal_type (code, name) values
  ('excused absence',     'Excused Absence'),
  ('form submission',     'Form Submission'),
  ('hour adjustment',     'Hour Adjustment'),
  ('leader role transfer','Leader Role Transfer'),
  ('others',              'Others')
on conflict (code) do nothing;

insert into nstp_component (code, name) values
  ('CWTS', 'Civic Welfare Training Service'),
  ('LTS',  'Literacy Training Service'),
  ('ROTC', 'Reserve Officers'' Training Corps')
on conflict (code) do nothing;

-- Default NSTP required hours (Admin Settings → academic config).
insert into system_settings (setting_key, setting_value) values
  ('default_nstp_hours', '60'::jsonb)
on conflict (setting_key) do nothing;

-- ============================================================
-- Audit log — append-only "who changed what" trail.
-- (Captured here from production; originally created ad hoc in the
--  SQL editor. RLS for these tables lives in 0002_rls.sql; the
--  form_requirement/form_submission audit triggers live in 0006.)
--
-- Label tables intentionally keep natural-key PKs (they are static
-- display config joined by name, referenced by no FK) — see review F15.
-- ============================================================
create table if not exists audit_table_label (
  table_name text primary key,
  label      text not null
);

create table if not exists audit_field_label (
  table_name text not null,
  field_name text not null,
  label      text not null,
  field_type text not null default 'text',
  primary key (table_name, field_name)
);

create table if not exists audit_log (
  audit_log_id   uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references app_user(app_user_id),
  table_name     text not null,
  record_id      uuid not null,
  action         text not null,            -- INSERT | UPDATE | DELETE (TG_OP)
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[],
  created_at     timestamptz not null default now()
);

-- Indexes for the recent-activity feed + audit page (review F16/F7).
create index if not exists audit_log_created_at_idx   on audit_log(created_at desc);
create index if not exists audit_log_actor_idx        on audit_log(actor_user_id);
create index if not exists audit_log_table_record_idx on audit_log(table_name, record_id);

-- Value formatter used by the readable view.
create or replace function public.fn_format_audit_value(p_value text, p_type text)
returns text language plpgsql
set search_path = public, pg_temp as $$
begin
  if p_value is null then return 'empty'; end if;
  case p_type
    when 'timestamp' then return to_char(p_value::timestamptz, 'Mon DD, YYYY HH12:MI AM');
    when 'boolean'   then return case p_value when 'true' then 'yes' when 'false' then 'no' else p_value end;
    else return p_value;
  end case;
exception when others then
  return p_value;
end;
$$;

-- Trigger fn: append one audit_log row per change. Executes as owner
-- (SECURITY DEFINER); EXECUTE is revoked from all roles since triggers
-- do not require it and it must stay off the PostgREST RPC surface (F6).
create or replace function public.fn_audit_log()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  _record_id uuid;
  _old jsonb := null;
  _new jsonb := null;
  _changed text[];
begin
  if tg_op = 'DELETE' then
    _record_id := (to_jsonb(old) ->> (tg_table_name || '_id'))::uuid;
    _old := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    _record_id := (to_jsonb(new) ->> (tg_table_name || '_id'))::uuid;
    _new := to_jsonb(new);
  else
    _record_id := (to_jsonb(new) ->> (tg_table_name || '_id'))::uuid;
    _old := to_jsonb(old);
    _new := to_jsonb(new);
    select array_agg(key) into _changed
    from jsonb_each(_new) n
    where n.value is distinct from (_old -> n.key)
      and n.key <> 'updated_at';
  end if;

  insert into public.audit_log (actor_user_id, table_name, record_id, action, old_data, new_data, changed_fields)
  values (auth.uid(), tg_table_name, _record_id, tg_op, _old, _new, _changed);

  return null;
end;
$$;
revoke execute on function public.fn_audit_log() from public, anon, authenticated;

-- Human-readable projection. security_invoker = true so audit_log RLS
-- applies to whoever queries the view directly (review F3) — without it
-- the view ran as owner and leaked old_data/new_data snapshots.
create or replace view public.audit_log_readable
with (security_invoker = true) as
select
  al.audit_log_id,
  al.created_at,
  u.app_user_id,
  coalesce(u.full_name, 'System') as actor_name,
  al.table_name,
  coalesce(tl.label, al.table_name) as table_label,
  al.record_id,
  al.action,
  case al.action
    when 'INSERT' then 'Created a new ' || coalesce(tl.label, al.table_name) || ' record'
    when 'DELETE' then 'Deleted a '     || coalesce(tl.label, al.table_name) || ' record'
    when 'UPDATE' then 'Changed ' || coalesce((
        select string_agg(
          coalesce(fl.label, cf.field_name)
            || ' from "' || public.fn_format_audit_value(al.old_data ->> cf.field_name, coalesce(fl.field_type, 'text'))
            || '" to "'  || public.fn_format_audit_value(al.new_data ->> cf.field_name, coalesce(fl.field_type, 'text')) || '"',
          ', ')
        from unnest(al.changed_fields) cf(field_name)
        left join public.audit_field_label fl on fl.table_name = al.table_name and fl.field_name = cf.field_name
      ), 'a field') || ' for ' || coalesce(tl.label, al.table_name)
    else null
  end as summary,
  al.old_data,
  al.new_data,
  al.changed_fields
from public.audit_log al
left join public.app_user u           on u.app_user_id = al.actor_user_id
left join public.audit_table_label tl on tl.table_name = al.table_name
order by al.created_at desc;

-- audit_log is append-only (sibling of block_attendance_event_mutation).
-- Retention/pruning must DISABLE these triggers (see dev_teardown.sql pattern).
create or replace function public.block_audit_log_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'audit_log is append-only; rows cannot be modified or deleted';
end;
$$;
drop trigger if exists audit_log_no_update on audit_log;
drop trigger if exists audit_log_no_delete on audit_log;
create trigger audit_log_no_update before update on audit_log
  for each row execute function public.block_audit_log_mutation();
create trigger audit_log_no_delete before delete on audit_log
  for each row execute function public.block_audit_log_mutation();

-- Audit triggers on the core tables (form_* triggers are created in 0006).
drop trigger if exists trg_audit_app_user on app_user;
create trigger trg_audit_app_user after insert or update or delete on app_user
  for each row execute function public.fn_audit_log();
drop trigger if exists trg_audit_appeal on appeal;
create trigger trg_audit_appeal after insert or update or delete on appeal
  for each row execute function public.fn_audit_log();
drop trigger if exists trg_audit_attendance_session on attendance_session;
create trigger trg_audit_attendance_session after insert or update or delete on attendance_session
  for each row execute function public.fn_audit_log();
drop trigger if exists trg_audit_enrollment on enrollment;
create trigger trg_audit_enrollment after insert or update or delete on enrollment
  for each row execute function public.fn_audit_log();

-- Friendly labels for the core audited tables (form_* labels seeded in 0006).
insert into audit_table_label (table_name, label) values
  ('app_user',           'user'),
  ('appeal',             'appeal'),
  ('attendance_session', 'attendance session'),
  ('enrollment',         'enrollment')
on conflict (table_name) do nothing;
