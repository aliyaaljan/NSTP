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
    s.name                                                        as section_name,
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
  group by s.section_id, s.name, s.course_code, s.required_hour_total;
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
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s dashboard';
  end if;

  return query
  with student_minutes as (
    select
      e.enrollment_id,
      e.section_id,
      coalesce(sum(att.duration_minute), 0) as total_minutes
    from enrollment e
    left join attendance_session att on att.enrollment_id = e.enrollment_id
    where att.attendance_session_status_id not in (
            select attendance_session_status_id from attendance_session_status
            where code in ('voided', 'open', 'under_appeal')
          )
      and e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.enrollment_id, e.section_id
  ),
  section_stats as (
    select
      s.section_id,
      s.name as section_name,
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
    group by s.section_id, s.name, s.required_hour_total
  ),
  pending_appeals as (
    select
      e.section_id,
      count(*)::integer as pending
    from appeal appe
    join enrollment e on e.enrollment_id = appe.enrollment_id
    join section s on s.section_id = e.section_id
    join term t on t.term_id = s.term_id
    where appe.appeal_status_id = (
            select appeal_status_id from appeal_status where code = 'open'
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
begin
  if not (p_adviser_user_id = auth.uid() or public.app_is_admin()) then
    raise exception 'not authorized to read this adviser''s sections';
  end if;

  return query
  select s.section_id, s.name
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

-- get_active_students_average_hours — admin analytics (both overloads).
-- No repo caller today; gated to admins and removed from the anon surface.
create or replace function public.get_active_students_average_hours(active_status_id uuid)
returns integer
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  total_minutes int := 0;
  total_students int := 0;
begin
  if not public.app_is_admin() then
    raise exception 'admin access required';
  end if;

  select coalesce(sum(duration_minute), 0)
  into total_minutes
  from public.attendance_session att
  join public.enrollment e on att.enrollment_id = e.enrollment_id
  where e.enrollment_status_id = active_status_id;

  select count(distinct student_user_id)
  into total_students
  from public.enrollment
  where enrollment_status_id = active_status_id;

  if total_students = 0 then
    return 0;
  else
    return round(total_minutes / 60.0 / total_students);
  end if;
end;
$function$;

create or replace function public.get_active_students_average_hours(
  active_status_id uuid,
  filter_section_name text default null,
  filter_adviser_id uuid default null
)
returns integer
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  total_minutes int := 0;
  total_students int := 0;
begin
  if not public.app_is_admin() then
    raise exception 'admin access required';
  end if;

  select coalesce(sum(att.duration_minute), 0)
  into total_minutes
  from public.attendance_session att
  join public.enrollment e on att.enrollment_id = e.enrollment_id
  join public.section s on e.section_id = s.section_id
  where e.enrollment_status_id = active_status_id
    and (filter_section_name is null or s.name = filter_section_name)
    and (filter_adviser_id is null or s.adviser_user_id = filter_adviser_id);

  select count(distinct e.student_user_id)
  into total_students
  from public.enrollment e
  join public.section s on e.section_id = s.section_id
  where e.enrollment_status_id = active_status_id
    and (filter_section_name is null or s.name = filter_section_name)
    and (filter_adviser_id is null or s.adviser_user_id = filter_adviser_id);

  if total_students = 0 then
    return 0;
  else
    return round(total_minutes / 60.0 / total_students);
  end if;
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
    'public.get_active_students_average_hours(uuid)',
    'public.get_active_students_average_hours(uuid, text, uuid)'
  ] loop
    execute format('revoke execute on function %s from public;', fn);
    execute format('revoke execute on function %s from anon;', fn);
    execute format('grant  execute on function %s to authenticated;', fn);
  end loop;
end $$;
