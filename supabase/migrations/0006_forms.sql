-- ============================================================
-- NSTP Hours Tracker — Form Repository (required forms & submissions)
--
-- Adds: form_submission_status (lookup), form_requirement,
--        form_requirement_exclusion, form_submission.
-- Creates the private Storage bucket "forms".
-- Integrates with audit system (guarded for fresh-DB safety).
-- ============================================================

-- ============================================================
-- Lookup: form_submission_status
-- ============================================================
create table form_submission_status (
  form_submission_status_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

insert into form_submission_status (code, name) values
  ('submitted', 'Submitted'),
  ('approved',  'Approved'),
  ('rejected',  'Rejected');

-- ============================================================
-- form_requirement — requirement catalog
-- section_id NULL = global default; set = section-specific
-- ============================================================
create table form_requirement (
  form_requirement_id       uuid primary key default gen_random_uuid(),
  section_id                uuid references section(section_id) on delete cascade,
  title                     text not null,
  description               text,
  template_storage_path     text,
  template_file_name        text,
  template_content_type     text,
  template_file_size_byte   bigint,
  due_date                  date,
  is_active                 boolean not null default true,
  created_by_user_id        uuid not null references app_user(app_user_id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ============================================================
-- form_requirement_exclusion — per-section opt-out of a global default
-- ============================================================
create table form_requirement_exclusion (
  form_requirement_exclusion_id uuid primary key default gen_random_uuid(),
  section_id                    uuid not null references section(section_id) on delete cascade,
  form_requirement_id           uuid not null references form_requirement(form_requirement_id) on delete cascade,
  created_by_user_id            uuid not null references app_user(app_user_id),
  created_at                    timestamptz not null default now(),
  unique (section_id, form_requirement_id)
);

-- ============================================================
-- form_submission — a student's completed upload
-- ============================================================
create table form_submission (
  form_submission_id          uuid primary key default gen_random_uuid(),
  form_requirement_id         uuid not null references form_requirement(form_requirement_id) on delete restrict,
  enrollment_id               uuid not null references enrollment(enrollment_id) on delete cascade,
  storage_path                text not null,
  file_name                   text not null,
  content_type                text,
  file_size_byte              bigint,
  form_submission_status_id   uuid not null references form_submission_status(form_submission_status_id),
  reviewer_comment            text,
  reviewed_by_user_id         uuid references app_user(app_user_id),
  reviewed_at                 timestamptz,
  submitted_at                timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (form_requirement_id, enrollment_id)
);

-- ============================================================
-- Indexes (covering FKs — matches 0001_schema.sql convention)
-- ============================================================
create index form_requirement_section_idx       on form_requirement(section_id);
create index form_requirement_created_by_idx    on form_requirement(created_by_user_id);
create index form_req_exclusion_section_idx     on form_requirement_exclusion(section_id);
create index form_req_exclusion_requirement_idx on form_requirement_exclusion(form_requirement_id);
create index form_req_exclusion_created_by_idx  on form_requirement_exclusion(created_by_user_id);
create index form_submission_requirement_idx    on form_submission(form_requirement_id);
create index form_submission_enrollment_idx     on form_submission(enrollment_id);
create index form_submission_status_idx         on form_submission(form_submission_status_id);
create index form_submission_reviewed_by_idx    on form_submission(reviewed_by_user_id);

-- ============================================================
-- updated_at auto-maintenance (moddatetime)
-- ============================================================
create trigger set_form_requirement_updated_at before update on form_requirement
  for each row execute procedure moddatetime(updated_at);
create trigger set_form_submission_updated_at  before update on form_submission
  for each row execute procedure moddatetime(updated_at);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Lookup: readable by any authenticated user; no write policy
alter table form_submission_status enable row level security;
create policy lookup_read on form_submission_status for select to authenticated using (true);

-- form_requirement: global (section_id null) visible to all; section-scoped via helper
alter table form_requirement enable row level security;
create policy form_requirement_read on form_requirement for select to authenticated
  using (section_id is null or public.app_can_read_section(section_id));

-- form_requirement_exclusion: readable by section members
alter table form_requirement_exclusion enable row level security;
create policy form_requirement_exclusion_read on form_requirement_exclusion for select to authenticated
  using (public.app_can_read_section(section_id));

-- form_submission: same scoping as attendance_session / appeal
alter table form_submission enable row level security;
create policy form_submission_read on form_submission for select to authenticated
  using (public.app_can_access_enrollment(enrollment_id));

-- ============================================================
-- Storage bucket: private, with size + MIME limits
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'forms', 'forms', false, 204800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ============================================================
-- Audit integration (guarded — safe on fresh DBs without audit system)
-- ============================================================
do $$ begin
  if to_regprocedure('public.fn_audit_log()') is not null then
    create trigger trg_audit_form_requirement
      after insert or update or delete on form_requirement
      for each row execute function public.fn_audit_log();
    create trigger trg_audit_form_submission
      after insert or update or delete on form_submission
      for each row execute function public.fn_audit_log();
  end if;

  if to_regclass('public.audit_table_labels') is not null then
    insert into public.audit_table_labels (table_name, label)
    values ('form_requirement', 'form requirement'), ('form_submission', 'form submission')
    on conflict do nothing;
  end if;
end $$;
