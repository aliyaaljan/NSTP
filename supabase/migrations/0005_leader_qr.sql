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
    where e.section_id         = p_section_id
      and e.student_user_id    = auth.uid()
      and e.is_student_leader  = true
      and es.code              = 'active'
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
