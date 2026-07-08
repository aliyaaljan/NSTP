-- ============================================================
-- 0005_leader_qr.sql
-- Student leader dashboard + QR attendance recording
--
-- Security model:
--   Read RPCs  → security definer, EXECUTE granted to authenticated
--   Write RPCs → security definer, EXECUTE granted to service_role ONLY
--                (revoked from public / anon / authenticated so a browser
--                 client cannot bypass Node authz via supabase.rpc())
--   All lookup IDs resolved by code inside SQL — never hardcoded UUIDs.
--   Concurrent writes serialized with SELECT ... FOR UPDATE on enrollment.
-- ============================================================

-- ============================================================
-- 1. Add self_student attendance source (idempotent)
-- ============================================================
insert into public.attendance_event_source (code, name) values
  ('self_student', 'Student Self-Log')
on conflict (code) do nothing;

-- ============================================================
-- 2. app_leads_section(p_section_id) → boolean
--    True iff the caller has an active is_student_leader enrollment
--    in the given section. Mirrors app_advises_section.
-- ============================================================
create or replace function public.app_leads_section(p_section_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1
    from  public.enrollment     e
    join  public.enrollment_status es on es.enrollment_status_id = e.enrollment_status_id
    join  public.section           s  on s.section_id = e.section_id
    join  public.section_status    ss on ss.section_status_id = s.section_status_id
    where e.section_id         = p_section_id
      and e.student_user_id    = auth.uid()
      and e.is_student_leader  = true
      and es.code              = 'active'
      and ss.code              = 'active'
  );
$$;

revoke execute on function public.app_leads_section(uuid) from public;
revoke execute on function public.app_leads_section(uuid) from anon;
grant  execute on function public.app_leads_section(uuid) to authenticated;

create or replace function public.class_label_surname(p_full_name text)
returns text language sql immutable as $$
  select case
    when position(',' in p_full_name) > 0 then trim(split_part(p_full_name, ',', 1))
    else (regexp_split_to_array(trim(p_full_name), '\s+'))[
           array_length(regexp_split_to_array(trim(p_full_name), '\s+'), 1)
         ]
  end;
$$;

drop function if exists public.class_label(text, text);

create or replace function public.class_label(p_course_code text, p_facilitator_name text, p_school_year text)
returns text language sql immutable as $$
  select case
    when coalesce(trim(p_course_code), '') <> '' and coalesce(trim(p_facilitator_name), '') <> ''
      then trim(p_course_code) || ' — ' || public.class_label_surname(p_facilitator_name)
           || case when coalesce(trim(p_school_year), '') <> '' then ' · A.Y. ' || trim(p_school_year) else '' end
    when coalesce(trim(p_course_code), '') <> ''
      then trim(p_course_code)
           || case when coalesce(trim(p_school_year), '') <> '' then ' · A.Y. ' || trim(p_school_year) else '' end
    when coalesce(trim(p_facilitator_name), '') <> '' then public.class_label_surname(p_facilitator_name)
    else 'Unassigned class'
  end;
$$;

revoke execute on function public.class_label(text, text, text) from public;
revoke execute on function public.class_label(text, text, text) from anon;
grant  execute on function public.class_label(text, text, text) to authenticated;
revoke execute on function public.class_label_surname(text) from public;
revoke execute on function public.class_label_surname(text) from anon;
grant  execute on function public.class_label_surname(text) to authenticated;

-- ============================================================
-- 3. get_leader_section_dashboard() → table
--    Roster + progress stats for the caller's led section.
--    Uses auth.uid() — no trusted params accepted.
-- ============================================================
create or replace function public.get_leader_section_dashboard()
returns table (
  section_id        uuid,
  section_name      text,
  course_code       text,
  required_hours    int,
  total_students    bigint,
  on_track          bigint,
  at_risk           bigint,
  has_open_session  bigint,
  students          jsonb
)
language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare
  v_section_id       uuid;
  v_active_status_id uuid;
  v_open_status_id   uuid;
  v_closed_status_id uuid;
begin
  select enrollment_status_id         into v_active_status_id from public.enrollment_status         where code = 'active';
  select attendance_session_status_id into v_open_status_id   from public.attendance_session_status where code = 'open';
  select attendance_session_status_id into v_closed_status_id from public.attendance_session_status where code = 'closed';

  -- Resolve the one active section the caller leads
  select e.section_id into v_section_id
  from   public.enrollment e
  where  e.student_user_id     = auth.uid()
    and  e.is_student_leader   = true
    and  e.enrollment_status_id = v_active_status_id
  limit 1;

  if v_section_id is null then
    return;  -- caller leads no active section; return empty
  end if;

  return query
  select
    s.section_id,
    public.class_label(s.course_code, au.full_name)               as section_name,
    s.course_code,
    s.required_hour_total                                         as required_hours,
    count(e.enrollment_id)                                        as total_students,
    count(e.enrollment_id) filter (
      where coalesce(hrs.minutes_rendered, 0) >= s.required_hour_total * 60 * 0.5
    )                                                             as on_track,
    count(e.enrollment_id) filter (
      where coalesce(hrs.minutes_rendered, 0) < s.required_hour_total * 60 * 0.5
    )                                                             as at_risk,
    count(e.enrollment_id) filter (
      where open_sess.attendance_session_id is not null
    )                                                             as has_open_session,
    jsonb_agg(
      jsonb_build_object(
        'enrollment_id',    e.enrollment_id,
        'name',             u.full_name,
        'student_number',   u.student_number,
        'minutes_rendered', coalesce(hrs.minutes_rendered, 0),
        'pct',              round(
                              coalesce(hrs.minutes_rendered, 0)::numeric
                              / nullif(s.required_hour_total * 60, 0) * 100,
                              1
                            ),
        'has_open_session', open_sess.attendance_session_id is not null
      )
      order by u.full_name
    )                                                             as students
  from        public.section s
  join        public.app_user au on au.app_user_id = s.adviser_user_id
  join        public.enrollment e
    on        e.section_id           = s.section_id
    and       e.enrollment_status_id = v_active_status_id
  join        public.app_user u on u.app_user_id = e.student_user_id
  left join lateral (
    select coalesce(sum(sess.duration_minute), 0)::int as minutes_rendered
    from   public.attendance_session sess
    where  sess.enrollment_id               = e.enrollment_id
      and  sess.attendance_session_status_id = v_closed_status_id
  ) hrs on true
  left join lateral (
    select sess.attendance_session_id
    from   public.attendance_session sess
    where  sess.enrollment_id               = e.enrollment_id
      and  sess.attendance_session_status_id = v_open_status_id
    limit 1
  ) open_sess on true
  where s.section_id = v_section_id
  group by s.section_id, au.full_name, s.course_code, s.required_hour_total;
end;
$$;

revoke execute on function public.get_leader_section_dashboard() from public;
revoke execute on function public.get_leader_section_dashboard() from anon;
grant  execute on function public.get_leader_section_dashboard() to authenticated;

-- ============================================================
-- 4. record_attendance_scan — QR scan → time-IN for a student
--
--    Called exclusively via the service-role key from Node server actions.
--    The Node action verifies scanner authz before calling this function.
--    This function trusts only the DB token row — never the QR payload's
--    enrollment or section fields. p_generated_meta carries the student's
--    device/location snapshot; p_scan_meta carries the scanner's.
-- ============================================================
create or replace function public.record_attendance_scan(
  p_enrollment_id  uuid,
  p_nonce          text,
  p_recorded_by    uuid,
  p_generated_meta jsonb,
  p_scan_meta      jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_type_time_in  uuid;
  v_source_qr     uuid;
  v_status_open   uuid;
  v_session_id    uuid;
  v_effective_at  timestamptz;
  v_rows_updated  int;
begin
  select attendance_event_type_id     into v_type_time_in from public.attendance_event_type     where code = 'time_in';
  select attendance_event_source_id   into v_source_qr    from public.attendance_event_source   where code = 'qr_scan';
  select attendance_session_status_id into v_status_open  from public.attendance_session_status where code = 'open';

  -- Serialize concurrent time-ins for the same student
  perform 1 from public.enrollment where enrollment_id = p_enrollment_id for update;

  -- Guard: student must not already have an open session
  if exists (
    select 1 from public.attendance_session
    where  enrollment_id               = p_enrollment_id
      and  attendance_session_status_id = v_status_open
  ) then
    raise exception 'student already has an open attendance session';
  end if;

  -- CAS consume: the single authoritative validity check.
  -- Correct nonce + not yet consumed + not expired (DB clock).
  update public.qr_current_token
  set    is_consumed = true,
         consumed_at = now()
  where  enrollment_id = p_enrollment_id
    and  current_nonce = p_nonce
    and  is_consumed   = false
    and  expires_at    > now();

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'QR token is invalid, expired, or already used';
  end if;

  v_effective_at := now();

  -- Open the attendance session
  insert into public.attendance_session (
    enrollment_id,
    attendance_session_status_id,
    started_at
  ) values (
    p_enrollment_id,
    v_status_open,
    v_effective_at
  ) returning attendance_session_id into v_session_id;

  -- Append the immutable time-in event.
  -- The qr_nonce unique index is the hard replay backstop; map the violation cleanly.
  begin
    insert into public.attendance_event (
      enrollment_id,
      attendance_session_id,
      attendance_event_type_id,
      attendance_event_source_id,
      effective_at,
      recorded_by_user_id,
      qr_nonce,
      qr_signature,
      generated_at,
      generated_latitude,
      generated_longitude,
      generated_accuracy_meter,
      generated_device_type,
      generated_browser,
      generated_os,
      generated_ip_address,
      scan_latitude,
      scan_longitude,
      scan_accuracy_meter,
      scanner_device_type,
      scanner_browser,
      scanner_os,
      scanner_ip_address
    ) values (
      p_enrollment_id,
      v_session_id,
      v_type_time_in,
      v_source_qr,
      v_effective_at,
      p_recorded_by,
      p_nonce,
      p_generated_meta->>'signature',
      (p_generated_meta->>'generated_at')::timestamptz,
      (p_generated_meta->>'latitude')::numeric,
      (p_generated_meta->>'longitude')::numeric,
      (p_generated_meta->>'accuracy_meter')::numeric,
      p_generated_meta->>'device_type',
      p_generated_meta->>'browser',
      p_generated_meta->>'os',
      nullif(p_generated_meta->>'ip_address', '')::inet,
      (p_scan_meta->>'latitude')::numeric,
      (p_scan_meta->>'longitude')::numeric,
      (p_scan_meta->>'accuracy_meter')::numeric,
      p_scan_meta->>'device_type',
      p_scan_meta->>'browser',
      p_scan_meta->>'os',
      nullif(p_scan_meta->>'ip_address', '')::inet
    );
  exception
    when unique_violation then
      raise exception 'QR nonce already recorded — replay detected';
  end;

  return jsonb_build_object(
    'event_type',   'time_in',
    'session_id',   v_session_id,
    'effective_at', v_effective_at
  );
end;
$$;

revoke execute on function public.record_attendance_scan(uuid, text, uuid, jsonb, jsonb) from public;
revoke execute on function public.record_attendance_scan(uuid, text, uuid, jsonb, jsonb) from anon;
revoke execute on function public.record_attendance_scan(uuid, text, uuid, jsonb, jsonb) from authenticated;

-- ============================================================
-- 5. record_leader_time_in — leader self-opens their own session
--
--    p_enrollment_id: the leader's own enrollment (not a peer's).
--    p_actor:         the leader's user id (from the validated session).
--    Authz re-verified in SQL: p_actor must own p_enrollment_id with
--    is_student_leader = true and status active.
-- ============================================================
create or replace function public.record_leader_time_in(
  p_enrollment_id uuid,
  p_actor         uuid,
  p_meta          jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_type_time_in   uuid;
  v_source_leader  uuid;
  v_status_open    uuid;
  v_active_status  uuid;
  v_session_id     uuid;
  v_effective_at   timestamptz;
begin
  select attendance_event_type_id     into v_type_time_in  from public.attendance_event_type     where code = 'time_in';
  select attendance_event_source_id   into v_source_leader  from public.attendance_event_source   where code = 'self_leader';
  select attendance_session_status_id into v_status_open   from public.attendance_session_status where code = 'open';
  select enrollment_status_id         into v_active_status  from public.enrollment_status          where code = 'active';

  -- Serialize and authz in one step: lock + verify ownership + leader flag
  perform 1
  from   public.enrollment e
  where  e.enrollment_id       = p_enrollment_id
    and  e.student_user_id     = p_actor
    and  e.is_student_leader   = true
    and  e.enrollment_status_id = v_active_status
  for update;

  if not found then
    raise exception 'actor does not own this enrollment or is not an active leader';
  end if;

  -- Guard: must not already have an open session on this enrollment
  if exists (
    select 1 from public.attendance_session
    where  enrollment_id               = p_enrollment_id
      and  attendance_session_status_id = v_status_open
  ) then
    raise exception 'already has an open attendance session';
  end if;

  v_effective_at := now();

  insert into public.attendance_session (
    enrollment_id,
    attendance_session_status_id,
    started_at
  ) values (
    p_enrollment_id,
    v_status_open,
    v_effective_at
  ) returning attendance_session_id into v_session_id;

  insert into public.attendance_event (
    enrollment_id,
    attendance_session_id,
    attendance_event_type_id,
    attendance_event_source_id,
    effective_at,
    recorded_by_user_id,
    scan_latitude,
    scan_longitude,
    scan_accuracy_meter,
    scanner_device_type,
    scanner_browser,
    scanner_os,
    scanner_ip_address
  ) values (
    p_enrollment_id,
    v_session_id,
    v_type_time_in,
    v_source_leader,
    v_effective_at,
    p_actor,
    (p_meta->>'latitude')::numeric,
    (p_meta->>'longitude')::numeric,
    (p_meta->>'accuracy_meter')::numeric,
    p_meta->>'device_type',
    p_meta->>'browser',
    p_meta->>'os',
    nullif(p_meta->>'ip_address', '')::inet
  );

  return jsonb_build_object(
    'event_type',   'time_in',
    'session_id',   v_session_id,
    'effective_at', v_effective_at
  );
end;
$$;

revoke execute on function public.record_leader_time_in(uuid, uuid, jsonb) from public;
revoke execute on function public.record_leader_time_in(uuid, uuid, jsonb) from anon;
revoke execute on function public.record_leader_time_in(uuid, uuid, jsonb) from authenticated;

-- ============================================================
-- 6. record_self_time_out — student or leader closes their own open session
--
--    p_source_code: 'self_student' or 'self_leader'
--    Authz per source:
--      self_student → p_actor must own the enrollment (any enrolled student)
--      self_leader  → p_actor must own the enrollment AND be an active leader
--    CAS close: UPDATE ... WHERE status = open; 0 rows → no open session.
-- ============================================================
create or replace function public.record_self_time_out(
  p_enrollment_id uuid,
  p_actor         uuid,
  p_source_code   text,
  p_meta          jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_type_time_out  uuid;
  v_source_id      uuid;
  v_status_open    uuid;
  v_status_closed  uuid;
  v_active_status  uuid;
  v_session_id     uuid;
  v_effective_at   timestamptz;
  v_rows_closed    int;
begin
  if p_source_code not in ('self_student', 'self_leader') then
    raise exception 'invalid source code: %', p_source_code;
  end if;

  select attendance_event_type_id     into v_type_time_out  from public.attendance_event_type     where code = 'time_out';
  select attendance_event_source_id   into v_source_id      from public.attendance_event_source   where code = p_source_code;
  select attendance_session_status_id into v_status_open    from public.attendance_session_status where code = 'open';
  select attendance_session_status_id into v_status_closed  from public.attendance_session_status where code = 'closed';
  select enrollment_status_id         into v_active_status  from public.enrollment_status          where code = 'active';

  -- Authz + lock: verify actor owns this enrollment (+ leader flag if self_leader)
  if p_source_code = 'self_student' then
    perform 1
    from   public.enrollment e
    where  e.enrollment_id   = p_enrollment_id
      and  e.student_user_id = p_actor
    for update;
  else
    perform 1
    from   public.enrollment e
    where  e.enrollment_id       = p_enrollment_id
      and  e.student_user_id     = p_actor
      and  e.is_student_leader   = true
      and  e.enrollment_status_id = v_active_status
    for update;
  end if;

  if not found then
    raise exception 'actor is not authorised to close this enrollment';
  end if;

  v_effective_at := now();

  -- CAS close: only succeeds if a session is currently open
  update public.attendance_session
  set    attendance_session_status_id = v_status_closed,
         ended_at                     = v_effective_at
  where  enrollment_id               = p_enrollment_id
    and  attendance_session_status_id = v_status_open
  returning attendance_session_id into v_session_id;

  get diagnostics v_rows_closed = row_count;
  if v_rows_closed = 0 then
    raise exception 'no open attendance session found for this enrollment';
  end if;

  insert into public.attendance_event (
    enrollment_id,
    attendance_session_id,
    attendance_event_type_id,
    attendance_event_source_id,
    effective_at,
    recorded_by_user_id,
    scan_latitude,
    scan_longitude,
    scan_accuracy_meter,
    scanner_device_type,
    scanner_browser,
    scanner_os,
    scanner_ip_address
  ) values (
    p_enrollment_id,
    v_session_id,
    v_type_time_out,
    v_source_id,
    v_effective_at,
    p_actor,
    (p_meta->>'latitude')::numeric,
    (p_meta->>'longitude')::numeric,
    (p_meta->>'accuracy_meter')::numeric,
    p_meta->>'device_type',
    p_meta->>'browser',
    p_meta->>'os',
    nullif(p_meta->>'ip_address', '')::inet
  );

  return jsonb_build_object(
    'event_type',   'time_out',
    'session_id',   v_session_id,
    'effective_at', v_effective_at
  );
end;
$$;

revoke execute on function public.record_self_time_out(uuid, uuid, text, jsonb) from public;
revoke execute on function public.record_self_time_out(uuid, uuid, text, jsonb) from anon;
revoke execute on function public.record_self_time_out(uuid, uuid, text, jsonb) from authenticated;

-- ============================================================
-- 7. Adviser / admin dashboard read RPCs
--    (Originally created ad hoc in the SQL editor; captured here.)
--
--    Security model — mirrors get_leader_section_dashboard above:
--      * SECURITY DEFINER + caller guard: the caller must be the
--        adviser themselves (auth.uid() = p_adviser_user_id) or an
--        admin. Without this, these were callable by anon with ANY
--        adviser id, leaking every section's roster + PII.
--      * SET search_path = public, pg_temp.
--      * EXECUTE revoked from anon/public, granted to authenticated.
--      * Lookup IDs resolved by code (no hardcoded UUIDs).
-- ============================================================

-- get_adviser_dashboard_data — roster + completion stats per section
create or replace function public.get_adviser_dashboard_data(p_adviser_user_id uuid)
returns table(
  section_id uuid, section_name text, total integer, pending integer,
  completed integer, completion_pct numeric, on_track integer,
  at_risk integer, students jsonb
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_adviser_name text;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s dashboard';
  end if;

  select full_name into v_adviser_name from app_user where app_user_id = p_adviser_user_id;

  return query
  with student_minutes as (
    select
      e.enrollment_id,
      e.section_id,
      coalesce(sum(att.duration_minute), 0) as total_minutes
    from enrollment e
    left join attendance_session att
      on att.enrollment_id = e.enrollment_id
      and att.attendance_session_status_id not in (
            select attendance_session_status_id from attendance_session_status
            where code in ('voided', 'open', 'under_appeal')
          )
    where e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.enrollment_id, e.section_id
  ),
  section_stats as (
    select
      s.section_id,
      public.class_label(s.course_code, v_adviser_name) as section_name,
      s.required_hour_total,
      count(sm.enrollment_id)::integer as total,
      count(sm.enrollment_id) filter (where sm.total_minutes::numeric >= s.required_hour_total*60)::integer as completed,
      count(sm.enrollment_id) filter (where ((now()::date - t.start_date)::numeric/nullif((t.end_date - t.start_date), 0)*100 - (sm.total_minutes::numeric/nullif(s.required_hour_total*60, 0)*100) <= 20))::integer as on_track,
      count(sm.enrollment_id) filter (where ((now()::date - t.start_date)::numeric/nullif((t.end_date - t.start_date), 0)*100 - (sm.total_minutes::numeric/nullif(s.required_hour_total*60, 0)*100) > 20))::integer as at_risk,
      jsonb_agg(json_build_object('name', u.full_name, 'pct', least(round(sm.total_minutes::numeric/nullif(s.required_hour_total*60, 0)*100), 100))) as students
    from section s
    join student_minutes sm on sm.section_id = s.section_id
    join term t on t.term_id = s.term_id
    join enrollment e on e.section_id = s.section_id and e.enrollment_id = sm.enrollment_id
    join app_user u on u.app_user_id = e.student_user_id
    where s.adviser_user_id = p_adviser_user_id
      and t.is_active = true
      and e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by s.section_id, s.course_code, s.required_hour_total
  ),
  pending_appeals as (
    select
      e.section_id,
      count(*)::integer as pending
    from appeal appe
    join enrollment e on e.enrollment_id = appe.enrollment_id
    join section s on s.section_id = e.section_id
    join term t on t.term_id = s.term_id
    where appe.appeal_status_id in (
            select appeal_status_id from appeal_status where code in ('pending', 'under_review')
          )
      and t.is_active = true
      and appe.assigned_adviser_user_id = p_adviser_user_id
      and e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.section_id
  ),
  all_sections as (
    select
      null::uuid as section_id,
      'All Sections'::text as section_name,
      (select sum(ss.total) from section_stats ss)::integer as total,
      (select coalesce(sum(pa.pending), 0) from pending_appeals pa)::integer as pending,
      (select sum(ss.completed) from section_stats ss)::integer as completed,
      least(round((select sum(ss.completed)::numeric from section_stats ss) / nullif((select sum(ss.total) from section_stats ss), 0) * 100, 2), 100) as completion_pct,
      (select sum(ss.on_track) from section_stats ss)::integer as on_track,
      (select sum(ss.at_risk) from section_stats ss)::integer as at_risk,
      (select jsonb_agg(student) from section_stats ss2, lateral jsonb_array_elements(ss2.students) as student) as students
  )
  select
    ss.section_id,
    ss.section_name,
    ss.total,
    coalesce(pa.pending, 0) as pending,
    ss.completed,
    least(round((ss.completed::numeric/nullif(ss.total,0)*100), 2), 100) as completion_pct,
    ss.on_track,
    ss.at_risk,
    ss.students
  from section_stats ss
  left join pending_appeals pa on pa.section_id = ss.section_id
  union all
  select * from all_sections;
end;
$function$;

-- get_sections — active-term sections for an adviser
create or replace function public.get_sections(p_adviser_user_id uuid)
returns table(id uuid, name text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_adviser_name text;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s sections';
  end if;

  select full_name into v_adviser_name from app_user where app_user_id = p_adviser_user_id;

  return query
  select s.section_id, public.class_label(s.course_code, v_adviser_name)
  from section s
  join term t on t.term_id = s.term_id
  where s.adviser_user_id = p_adviser_user_id and t.is_active = true;
end;
$function$;

-- get_adviser_recent_activity — last 7 days of audit activity for the adviser
create or replace function public.get_adviser_recent_activity(p_adviser_user_id uuid)
returns table(summary text, created_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s activity';
  end if;

  return query
  select ar.summary, ar.created_at
  from public.audit_log_readable ar
  join app_user au on au.app_user_id = ar.app_user_id
  where ar.created_at >= now() - interval '7 days'
    and au.app_user_id = p_adviser_user_id;
end;
$function$;

-- ------------------------------------------------------------
-- Facilitator "My Students" / dashboard drift RPCs (Rows 108 + 109).
--   get_active_sem, get_students_stats, get_my_students,
--   update_attendance_session.
--   Originally created ad hoc in the SQL editor and left anon-executable
--   with a client-trusted p_adviser_user_id (IDOR). Captured here with the
--   same hardening as the adviser RPCs above: caller guard
--   (auth.uid() = p_adviser_user_id OR app_is_admin()), pinned search_path,
--   lookup IDs resolved by code (no hardcoded UUIDs), and EXECUTE revoked
--   from anon/public + granted to authenticated (see loop below).
--   get_my_students returns sais_id for the facilitator roster (Row 115).
-- ------------------------------------------------------------

-- get_active_sem — active-term end date + "days left" per adviser section
create or replace function public.get_active_sem(p_adviser_user_id uuid)
returns table(section_id uuid, section_name text, sem_end_date date, remaining_days text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_adviser_name text;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s active term';
  end if;

  select full_name into v_adviser_name from app_user where app_user_id = p_adviser_user_id;

  return query
  select
    s.section_id,
    public.class_label(s.course_code, v_adviser_name) as section_name,
    t.end_date as sem_end_date,
    case
      when floor(t.end_date - current_date) <= 0 then 'Semester ended'
      else
        floor(t.end_date - current_date)::text ||
        case
          when floor(t.end_date - current_date) = 1 then ' day left'
          else ' days left'
        end
    end as remaining_days
  from section s
  join term t on t.term_id = s.term_id
  where s.adviser_user_id = p_adviser_user_id
    and t.is_active = true;
end;
$function$;

-- get_students_stats — per-section completion + pending-request counts
create or replace function public.get_students_stats(p_adviser_user_id uuid)
returns table(section_id uuid, section_name text, total integer, completed integer, in_progress integer, pending_request integer)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_adviser_name text;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s student stats';
  end if;

  select full_name into v_adviser_name from app_user where app_user_id = p_adviser_user_id;

  return query
  with student_minutes as (
    select
      e.enrollment_id,
      e.section_id,
      coalesce(sum(att.duration_minute), 0) as total_minutes
    from enrollment e
    left join attendance_session att on att.enrollment_id = e.enrollment_id
    where (att.attendance_session_status_id is null
           or att.attendance_session_status_id not in (
             select attendance_session_status_id from attendance_session_status
             where code in ('voided', 'open', 'under_appeal')
           ))
      and e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.enrollment_id, e.section_id
  ),
  -- 'pending' is the live open-appeal code; 'open' kept as a superset so a
  -- fresh migration DB (which seeds 'open') counts the same appeals. See the
  -- appeal_status seed drift note.
  pending_requests as (
    select
      e.section_id,
      count(*)::integer as pending
    from appeal appe
    join enrollment e on e.enrollment_id = appe.enrollment_id
    where appe.appeal_status_id in (
            select appeal_status_id from appeal_status
            where code in ('pending', 'open', 'under_review')
          )
    group by e.section_id
  ),
  section_stats as (
    select
      s.section_id,
      public.class_label(s.course_code, v_adviser_name) as section_name,
      count(sm.enrollment_id)::integer as total,
      count(sm.enrollment_id) filter (where sm.total_minutes::numeric >= s.required_hour_total*60)::integer as completed,
      count(sm.enrollment_id) filter (where sm.total_minutes::numeric < s.required_hour_total*60)::integer as in_progress,
      coalesce(max(pa.pending), 0)::integer as pending_request
    from section s
    join student_minutes sm on sm.section_id = s.section_id
    join term t on t.term_id = s.term_id
    left join pending_requests pa on pa.section_id = s.section_id
    where s.adviser_user_id = p_adviser_user_id
      and t.is_active = true
    group by s.section_id, s.course_code
  ),
  all_sections as (
    select
      null::uuid as section_id,
      'All Sections'::text as section_name,
      coalesce(sum(ss.total), 0)::integer as total,
      coalesce(sum(ss.completed), 0)::integer as completed,
      coalesce(sum(ss.in_progress), 0)::integer as in_progress,
      coalesce(sum(ss.pending_request), 0)::integer as pending_request
    from section_stats ss
  )
  select * from all_sections
  union all
  select * from section_stats;
end;
$function$;

-- get_my_students — roster with logged hours, status, sessions, SAIS ID
create or replace function public.get_my_students(p_adviser_user_id uuid)
returns table(section_id uuid, section_name text, student_name text, student_number text, sais_id numeric, site_location text, program text, classification text, status text, hours_logged numeric, total_hours integer, sessions jsonb)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_adviser_name text;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s students';
  end if;

  select full_name into v_adviser_name from app_user where app_user_id = p_adviser_user_id;

  return query
  with student_minutes as (
    select
      e.enrollment_id,
      coalesce(sum(att.duration_minute), 0) as total_minutes
    from enrollment e
    left join attendance_session att
      on att.enrollment_id = e.enrollment_id
      and att.attendance_session_status_id not in (
            select attendance_session_status_id from attendance_session_status
            where code in ('voided', 'open', 'under_appeal')
          )
    where e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.enrollment_id
  ),
  student_sessions as (
    select
      att.enrollment_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', att.attendance_session_id,
            'date', to_char(att.started_at at time zone 'Asia/Manila', 'Mon DD, YYYY'),
            'timeIn', to_char(att.started_at at time zone 'Asia/Manila', 'HH12:MI AM'),
            'timeOut', to_char(att.ended_at at time zone 'Asia/Manila', 'HH12:MI AM'),
            'hours', round(att.duration_minute / 60.0, 2)
          )
          order by att.started_at
        ),
        '[]'::jsonb
      ) as sessions
    from attendance_session att
    where att.attendance_session_status_id not in (
            select attendance_session_status_id from attendance_session_status
            where code in ('voided', 'open', 'under_appeal')
          )
    group by att.enrollment_id
  )
  select
    s.section_id,
    public.class_label(s.course_code, v_adviser_name) as section_name,
    u.full_name as student_name,
    u.student_number as student_number,
    u.sais_id::numeric as sais_id,
    g.label as site_location,
    p.name as program,
    sc.name as classification,
    case
      when round(coalesce(sm.total_minutes, 0) / 60.0, 2) >= s.required_hour_total then 'Completed'
      when round(coalesce(sm.total_minutes, 0) / 60.0, 2) > 0 then 'In Progress'
      else 'Not Started'
    end as status,
    round(sm.total_minutes / 60.0, 2) as hours_logged,
    s.required_hour_total as total_hours,
    coalesce(ss.sessions, '[]'::jsonb) as sessions
  from section s
    join term t on t.term_id = s.term_id
    join enrollment e on e.section_id = s.section_id
    left join student_minutes sm on sm.enrollment_id = e.enrollment_id
    left join student_sessions ss on ss.enrollment_id = e.enrollment_id
    join app_user u on u.app_user_id = e.student_user_id
    left join section_geofence g on g.section_geofence_id = e.assigned_geofence_id
    left join program p on p.program_id = e.program_id
    left join student_classification sc on sc.student_classification_id = e.student_classification_id
  where s.adviser_user_id = p_adviser_user_id
    and s.section_status_id = (
          select section_status_id from section_status where code = 'active'
        )
    and t.is_active = true
    and e.enrollment_status_id = (
          select enrollment_status_id from enrollment_status where code = 'active'
        )
  order by u.full_name;
end;
$function$;

-- update_attendance_session — adviser correction of a session's in/out times
create or replace function public.update_attendance_session(
  p_attendance_session_id uuid,
  p_adviser_user_id uuid,
  p_session_date date,
  p_time_in time without time zone,
  p_time_out time without time zone
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_enrollment_id uuid;
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to edit this session';
  end if;

  select att.enrollment_id into v_enrollment_id
  from attendance_session att
  join enrollment e on e.enrollment_id = att.enrollment_id
  join section s on s.section_id = e.section_id
  where att.attendance_session_id = p_attendance_session_id
    and s.adviser_user_id = p_adviser_user_id;

  if v_enrollment_id is null then
    raise exception 'Not authorized to edit this session';
  end if;

  update attendance_session
  set
    started_at = (p_session_date + p_time_in) at time zone 'Asia/Manila',
    ended_at = (p_session_date + p_time_out) at time zone 'Asia/Manila'
  where attendance_session_id = p_attendance_session_id;
end;
$function$;

-- Lock down the RPC surface: authenticated only (the guard enforces row scope).
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.get_adviser_dashboard_data(uuid)',
    'public.get_sections(uuid)',
    'public.get_adviser_recent_activity(uuid)',
    'public.get_active_sem(uuid)',
    'public.get_students_stats(uuid)',
    'public.get_my_students(uuid)',
    'public.update_attendance_session(uuid, uuid, date, time, time)'
  ] loop
    execute format('revoke execute on function %s from public;', fn);
    execute format('revoke execute on function %s from anon;', fn);
    execute format('grant  execute on function %s to authenticated;', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast attendance_session row changes so the student QR page
-- (and, later, an adviser live-arrival dashboard) can react instantly.
-- RLS still applies to Realtime: each subscriber receives only the rows it may
-- read under attendance_session_read (own enrollment / advised section / admin).
-- Idempotent so re-running the migration is safe.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance_session'
  ) then
    alter publication supabase_realtime add table public.attendance_session;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime Broadcast authorization for the per-user "you've been scanned"
-- signal. recordScan() sends a private broadcast on `attendance-user:<uid>`;
-- this policy lets an authenticated user RECEIVE only on their own topic, so
-- no one can listen in on another student's scans. Sending is done with the
-- service-role key, which bypasses RLS. Idempotent.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('realtime.messages') is not null then
    drop policy if exists "attendance signal: receive own" on realtime.messages;
    create policy "attendance signal: receive own"
      on realtime.messages
      for select
      to authenticated
      using (
        extension = 'broadcast'
        and topic = 'attendance-user:' || (select auth.uid())::text
      );
  end if;
end $$;
