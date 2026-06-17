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
  code text not null unique,          -- 'open'|'closed'|'auto_closed'|'voided'|'under_appeal'|'corrected'
  name text not null
);

create table appeal_status (
  appeal_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'open'|'under_review'|'approved'|'rejected'|'withdrawn'
  name text not null
);

create table section_status (
  section_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'draft' | 'active' | 'completed' | 'archived'
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
  name                text not null,
  section_status_id   uuid not null references section_status(section_status_id),
  required_hour_total integer default 60,
  daily_cutoff_time   time default '23:59',  -- auto-void cutoff (Asia/Manila local)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
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
  program              text,
  classification       text,
  enlistment_status    text,           -- registrar-side status from CSV import
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
  requested_time_in        timestamptz,
  requested_time_out       timestamptz,
  reason                   text not null,
  resolution_note          text,
  resolved_by_user_id      uuid references app_user(app_user_id),
  resolved_at              timestamptz,
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

insert into attendance_session_status (code, name) values
  ('open',         'Open'),
  ('closed',       'Closed'),
  ('auto_closed',  'Auto-Closed (geofence exit)'),
  ('voided',       'Voided (forgot to time out)'),
  ('under_appeal', 'Under Appeal'),
  ('corrected',    'Corrected')
on conflict (code) do nothing;

insert into appeal_status (code, name) values
  ('open',         'Open'),
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
