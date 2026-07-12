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

-- Great-circle distance in meters between two lat/lng points (haversine).
create or replace function public.haversine_m(
  p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric
) returns numeric
language sql immutable
set search_path = public, pg_temp as $$
  select 2 * 6371000 * asin(least(1.0, sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2))
    * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  )));
$$;

revoke execute on function public.haversine_m(numeric,numeric,numeric,numeric) from public;
revoke execute on function public.haversine_m(numeric,numeric,numeric,numeric) from anon;
grant  execute on function public.haversine_m(numeric,numeric,numeric,numeric) to authenticated;

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
  v_corrected_status_id uuid;
begin
  select enrollment_status_id         into v_active_status_id from public.enrollment_status         where code = 'active';
  select attendance_session_status_id into v_open_status_id   from public.attendance_session_status where code = 'open';
  select attendance_session_status_id into v_closed_status_id from public.attendance_session_status where code = 'closed';
  select attendance_session_status_id into v_corrected_status_id from public.attendance_session_status where code = 'corrected';

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
    public.class_label(s.course_code, au.full_name, t.school_year) as section_name,
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
        'has_open_session', open_sess.attendance_session_id is not null,
        'generated_at',     qct.generated_at,
        'scanned_at',       open_sess.started_at
      )
      order by u.full_name
    )                                                             as students
  from        public.section s
  join        public.app_user au on au.app_user_id = s.adviser_user_id
  join        public.term t on t.term_id = s.term_id
  join        public.enrollment e
    on        e.section_id           = s.section_id
    and       e.enrollment_status_id = v_active_status_id
  join        public.app_user u on u.app_user_id = e.student_user_id
  left join lateral (
    select coalesce(sum(sess.duration_minute), 0)::int as minutes_rendered
    from   public.attendance_session sess
    where  sess.enrollment_id               = e.enrollment_id
      and  sess.attendance_session_status_id in (v_closed_status_id, v_corrected_status_id)
  ) hrs on true
  left join lateral (
    select sess.attendance_session_id, sess.started_at
    from   public.attendance_session sess
    where  sess.enrollment_id               = e.enrollment_id
      and  sess.attendance_session_status_id = v_open_status_id
    limit 1
  ) open_sess on true
  left join lateral (
    select qc.generated_at
    from   public.qr_current_token qc
    where  qc.enrollment_id = e.enrollment_id
  ) qct on true
  where s.section_id = v_section_id
  group by s.section_id, au.full_name, s.course_code, s.required_hour_total, t.school_year;
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
  v_type_time_in   uuid;
  v_source_qr      uuid;
  v_status_open    uuid;
  v_session_id     uuid;
  v_effective_at   timestamptz;
  v_rows_updated   int;
  -- fraud-flag rule state
  v_student_user   uuid;
  v_student_name   text;
  v_gen_device     text;
  v_gen_dev_new    boolean;
  v_gen_ip         inet;
  v_gen_devtype    text;
  v_gen_browser    text;
  v_gen_os         text;
  v_gen_lat        numeric;
  v_gen_lng        numeric;
  v_gen_acc        numeric;
  v_scan_lat       numeric;
  v_scan_lng       numeric;
  v_scan_acc       numeric;
  v_manila_day     date;
  v_at             text;
  v_reasons        jsonb := '[]'::jsonb;
  v_prev           record;
  v_matches        jsonb;
  v_dist           numeric;
  v_allowed        numeric;
begin
  select attendance_event_type_id     into v_type_time_in from public.attendance_event_type     where code = 'time_in';
  select attendance_event_source_id   into v_source_qr    from public.attendance_event_source   where code = 'qr_scan';
  select attendance_session_status_id into v_status_open  from public.attendance_session_status where code = 'open';

  -- Serialize concurrent time-ins for the same student; resolve the student.
  select e.student_user_id into v_student_user
  from   public.enrollment e
  where  e.enrollment_id = p_enrollment_id
  for update;

  if v_student_user is null then
    raise exception 'enrollment not found';
  end if;

  select u.full_name into v_student_name
  from   public.app_user u
  where  u.app_user_id = v_student_user;

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
  v_at           := to_char(v_effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_manila_day   := (v_effective_at at time zone 'Asia/Manila')::date;

  v_gen_device  := nullif(p_generated_meta->>'device_id', '');
  v_gen_dev_new := coalesce((p_generated_meta->>'device_id_is_new')::boolean, false);
  v_gen_ip      := nullif(p_generated_meta->>'ip_address', '')::inet;
  v_gen_devtype := nullif(p_generated_meta->>'device_type', '');
  v_gen_browser := nullif(p_generated_meta->>'browser', '');
  v_gen_os      := nullif(p_generated_meta->>'os', '');
  v_gen_lat     := (p_generated_meta->>'latitude')::numeric;
  v_gen_lng     := (p_generated_meta->>'longitude')::numeric;
  v_gen_acc     := (p_generated_meta->>'accuracy_meter')::numeric;
  v_scan_lat    := (p_scan_meta->>'latitude')::numeric;
  v_scan_lng    := (p_scan_meta->>'longitude')::numeric;
  v_scan_acc    := (p_scan_meta->>'accuracy_meter')::numeric;

  -- ── Fraud rules R1–R3 run BEFORE inserting the new event so lookups can't
  -- self-match. Advisory only: they add reasons, never abort the scan.
  -- Only QR time-ins (source qr_scan) carry generated_* device meta — the
  -- source filter keeps seeded/manual events from ever matching.

  -- R1 device_changed: generated device differs from this student's previous QR time-in.
  select ae.attendance_event_id,
         ae.generated_device_id,
         ae.generated_ip_address,
         ae.generated_device_type,
         ae.generated_browser,
         ae.generated_os
  into   v_prev
  from   public.attendance_event ae
  join   public.enrollment e2 on e2.enrollment_id = ae.enrollment_id
  where  e2.student_user_id = v_student_user
    and  ae.attendance_event_type_id   = v_type_time_in
    and  ae.attendance_event_source_id = v_source_qr
  order by ae.effective_at desc
  limit 1;

  if found then  -- first-ever QR time-in never flags
    if v_gen_device is not null and not v_gen_dev_new and v_prev.generated_device_id is not null then
      -- both sides have an established device id: compare ids; UA drift alone never flags
      if v_gen_device <> v_prev.generated_device_id then
        v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
          'code', 'device_changed',
          'message', 'QR was generated on a different device than this student''s previous time-in.',
          'at', v_at,
          'meta', jsonb_build_object(
            'matched_by',      'device_id',
            'device_id',       v_gen_device,
            'prev_device_id',  v_prev.generated_device_id,
            'prev_event_id',   v_prev.attendance_event_id,
            'ip_address',      host(v_gen_ip),
            'prev_ip_address', host(v_prev.generated_ip_address))));
      end if;
    elsif (v_gen_devtype, v_gen_browser, v_gen_os) is distinct from
          (v_prev.generated_device_type, v_prev.generated_browser, v_prev.generated_os)
          and coalesce(v_gen_devtype, v_gen_browser, v_gen_os,
                       v_prev.generated_device_type, v_prev.generated_browser, v_prev.generated_os) is not null
    then
      -- fallback when a device id is missing/fresh on either side: coarse fingerprint
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'device_changed',
        'message', 'QR was generated on a different device than this student''s previous time-in.',
        'at', v_at,
        'meta', jsonb_build_object(
          'matched_by',       'fingerprint',
          'device_id_is_new', v_gen_dev_new,
          'prev_event_id',    v_prev.attendance_event_id,
          'ip_address',       host(v_gen_ip),
          'prev_ip_address',  host(v_prev.generated_ip_address))));
    end if;
  end if;

  -- R2 shared_device: same device generated a QR time-in for a DIFFERENT student
  -- today (Asia/Manila). Primary match = stored device ids equal. Heuristic
  -- fallback (only when the generating side has no established id, or the
  -- compared event has none): same IP AND same device_type+browser+os, all non-null.
  select jsonb_agg(jsonb_build_object(
           'session_id',    ae.attendance_session_id,
           'enrollment_id', e2.enrollment_id,
           'student_name',  u2.full_name,
           'matched_by',    case when v_gen_device is not null and ae.generated_device_id = v_gen_device
                                 then 'device_id' else 'ip_fingerprint' end))
  into   v_matches
  from   public.attendance_event ae
  join   public.enrollment e2 on e2.enrollment_id = ae.enrollment_id
  join   public.app_user   u2 on u2.app_user_id   = e2.student_user_id
  where  ae.attendance_event_type_id   = v_type_time_in
    and  ae.attendance_event_source_id = v_source_qr
    and  ae.attendance_session_id is not null
    and  (ae.effective_at at time zone 'Asia/Manila')::date = v_manila_day
    and  e2.student_user_id <> v_student_user   -- same student w/ 2 enrollments never self-matches
    and  (
          (v_gen_device is not null and ae.generated_device_id = v_gen_device)
          or
          ((v_gen_device is null or v_gen_dev_new or ae.generated_device_id is null)
            and v_gen_ip      is not null and ae.generated_ip_address  = v_gen_ip
            and v_gen_devtype is not null and ae.generated_device_type = v_gen_devtype
            and v_gen_browser is not null and ae.generated_browser     = v_gen_browser
            and v_gen_os      is not null and ae.generated_os          = v_gen_os)
        );

  if v_matches is not null then
    v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
      'code', 'shared_device',
      'message', 'The device that generated this QR also generated a time-in for '
                 || coalesce(v_matches->0->>'student_name', 'another student')
                 || case when jsonb_array_length(v_matches) > 1
                         then ' and ' || (jsonb_array_length(v_matches) - 1)::text || ' other student(s)'
                         else '' end
                 || ' today.',
      'at', v_at,
      'meta', jsonb_build_object(
        'matched_by', v_matches->0->>'matched_by',
        'device_id',  v_gen_device,
        'ip_address', host(v_gen_ip),
        'others',     v_matches)));
  end if;

  -- R3 scan_distance: generated GPS vs scanner GPS further apart than 200 m + both accuracies.
  if v_gen_lat is not null and v_gen_lng is not null
     and v_scan_lat is not null and v_scan_lng is not null then
    v_dist    := public.haversine_m(v_gen_lat, v_gen_lng, v_scan_lat, v_scan_lng);
    v_allowed := 200 + coalesce(v_gen_acc, 0) + coalesce(v_scan_acc, 0);
    if v_dist > v_allowed then
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'scan_distance',
        'message', 'QR was generated ~' || round(v_dist)::int
                   || ' m from where it was scanned (allowed ~' || round(v_allowed)::int || ' m).',
        'at', v_at,
        'meta', jsonb_build_object('distance_m', round(v_dist)::int, 'allowed_m', round(v_allowed)::int)));
    end if;
  end if;

  -- Open the attendance session (flags included so the CHECK constraint holds)
  insert into public.attendance_session (
    enrollment_id,
    attendance_session_status_id,
    started_at,
    is_flagged,
    flag_reasons
  ) values (
    p_enrollment_id,
    v_status_open,
    v_effective_at,
    jsonb_array_length(v_reasons) > 0,
    v_reasons
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
      generated_device_id,
      scan_latitude,
      scan_longitude,
      scan_accuracy_meter,
      scanner_device_type,
      scanner_browser,
      scanner_os,
      scanner_ip_address,
      scanner_device_id
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
      v_gen_lat,
      v_gen_lng,
      v_gen_acc,
      v_gen_devtype,
      v_gen_browser,
      v_gen_os,
      v_gen_ip,
      v_gen_device,
      v_scan_lat,
      v_scan_lng,
      v_scan_acc,
      p_scan_meta->>'device_type',
      p_scan_meta->>'browser',
      p_scan_meta->>'os',
      nullif(p_scan_meta->>'ip_address', '')::inet,
      nullif(p_scan_meta->>'device_id', '')
    );
  exception
    when unique_violation then
      raise exception 'QR nonce already recorded — replay detected';
  end;

  -- R2 retro-flag: the matched earlier session(s) of the other student(s).
  -- (attendance_event stays append-only — only the session rows are updated.)
  if v_matches is not null then
    update public.attendance_session s
    set    is_flagged   = true,
           flag_reasons = s.flag_reasons || jsonb_build_array(jsonb_build_object(
             'code', 'shared_device',
             'message', 'The device used for this time-in later generated a QR time-in for '
                        || coalesce(v_student_name, 'another student') || ' today.',
             'at', v_at,
             'meta', jsonb_build_object(
               'matched_by',          m.value->>'matched_by',
               'other_session_id',    v_session_id,
               'other_enrollment_id', p_enrollment_id,
               'device_id',           v_gen_device,
               'ip_address',          host(v_gen_ip))))
    from   jsonb_array_elements(v_matches) m
    where  s.attendance_session_id = (m.value->>'session_id')::uuid;
  end if;

  -- Deliberately no flag info in the return value — the scanner may be the accomplice.
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
    scanner_ip_address,
    scanner_device_id
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
    nullif(p_meta->>'ip_address', '')::inet,
    nullif(p_meta->>'device_id', '')
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
  v_type_time_in   uuid;
  v_source_id      uuid;
  v_status_open    uuid;
  v_status_closed  uuid;
  v_active_status  uuid;
  v_session_id     uuid;
  v_open_session   uuid;
  v_effective_at   timestamptz;
  v_rows_closed    int;
  v_section_id     uuid;
  v_lat            numeric;
  v_lng            numeric;
  v_at             text;
  v_reasons        jsonb := '[]'::jsonb;
  v_offsite        record;
  v_actor_device   text;
  v_actor_dev_new  boolean;
  v_actor_devtype  text;
  v_actor_browser  text;
  v_actor_os       text;
  v_tin            record;
begin
  if p_source_code not in ('self_student', 'self_leader') then
    raise exception 'invalid source code: %', p_source_code;
  end if;

  select attendance_event_type_id     into v_type_time_out  from public.attendance_event_type     where code = 'time_out';
  select attendance_event_type_id     into v_type_time_in   from public.attendance_event_type     where code = 'time_in';
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

  -- Resolve the open session up front so the flag rules can reference it.
  select attendance_session_id into v_open_session
  from   public.attendance_session
  where  enrollment_id                = p_enrollment_id
    and  attendance_session_status_id = v_status_open
  order by started_at desc
  limit 1;

  if v_open_session is null then
    raise exception 'no open attendance session found for this enrollment';
  end if;

  v_effective_at := now();
  v_at           := to_char(v_effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  -- R5 offsite (Business Rule #2): flag when the reported GPS point is outside ALL
  -- of the section's active geofences. Advisory only — the session still closes
  -- and counts. No GPS or no geofences → no flag.
  v_lat := (p_meta->>'latitude')::numeric;
  v_lng := (p_meta->>'longitude')::numeric;
  if v_lat is not null and v_lng is not null then
    select e.section_id into v_section_id
    from   public.enrollment e
    where  e.enrollment_id = p_enrollment_id;

    select count(*)                                            as total,
           count(*) filter (where g.dist_m <= g.radius_meter)  as inside,
           round(min(g.dist_m))::int                           as min_dist,
           (array_agg(g.label order by g.dist_m))[1]           as nearest_label
    into   v_offsite
    from (
      select coalesce(sg.label, 'site') as label,
             sg.radius_meter,
             public.haversine_m(sg.center_latitude, sg.center_longitude, v_lat, v_lng) as dist_m
      from public.section_geofence sg
      where sg.section_id = v_section_id
        and sg.is_active
    ) g;

    if v_offsite.total > 0 and v_offsite.inside = 0 then
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'offsite',
        'message', 'Timed out ~' || v_offsite.min_dist
                   || ' m from the nearest site (' || v_offsite.nearest_label || ').',
        'at', v_at,
        'meta', jsonb_build_object('distance_m', v_offsite.min_dist,
                                   'nearest_label', v_offsite.nearest_label)));
    end if;
  end if;

  -- R4 timeout_device_mismatch: the time-out actor's device differs from the device
  -- that OPENED the session (generated_device_id for QR time-ins, scanner_device_id
  -- for leader self time-ins). Catches "friend times me out after I leave early".
  v_actor_device  := nullif(p_meta->>'device_id', '');
  v_actor_dev_new := coalesce((p_meta->>'device_id_is_new')::boolean, false);
  v_actor_devtype := nullif(p_meta->>'device_type', '');
  v_actor_browser := nullif(p_meta->>'browser', '');
  v_actor_os      := nullif(p_meta->>'os', '');

  select ae.attendance_event_id,
         coalesce(ae.generated_device_id,   ae.scanner_device_id)   as ref_device,
         coalesce(ae.generated_device_type, ae.scanner_device_type) as ref_devtype,
         coalesce(ae.generated_browser,     ae.scanner_browser)     as ref_browser,
         coalesce(ae.generated_os,          ae.scanner_os)          as ref_os
  into   v_tin
  from   public.attendance_event ae
  where  ae.attendance_session_id    = v_open_session
    and  ae.attendance_event_type_id = v_type_time_in
  order by ae.recorded_at desc
  limit 1;

  if found then  -- sessions without a time-in event (manual adds) are skipped
    if v_actor_device is not null and not v_actor_dev_new and v_tin.ref_device is not null then
      if v_actor_device <> v_tin.ref_device then
        v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
          'code', 'timeout_device_mismatch',
          'message', 'Timed out from a different device than the one used at time-in.',
          'at', v_at,
          'meta', jsonb_build_object(
            'matched_by',        'device_id',
            'actor_device_id',   v_actor_device,
            'time_in_device_id', v_tin.ref_device,
            'time_in_event_id',  v_tin.attendance_event_id,
            'ip_address',        nullif(p_meta->>'ip_address', ''))));
      end if;
    elsif (v_actor_devtype, v_actor_browser, v_actor_os) is distinct from
          (v_tin.ref_devtype, v_tin.ref_browser, v_tin.ref_os)
          and coalesce(v_actor_devtype, v_actor_browser, v_actor_os,
                       v_tin.ref_devtype, v_tin.ref_browser, v_tin.ref_os) is not null
    then
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'timeout_device_mismatch',
        'message', 'Timed out from a different device than the one used at time-in.',
        'at', v_at,
        'meta', jsonb_build_object(
          'matched_by',       'fingerprint',
          'device_id_is_new', v_actor_dev_new,
          'time_in_event_id', v_tin.attendance_event_id,
          'ip_address',       nullif(p_meta->>'ip_address', ''))));
    end if;
  end if;

  -- CAS close: status predicate keeps the race guard.
  update public.attendance_session
  set    attendance_session_status_id = v_status_closed,
         ended_at                     = v_effective_at,
         is_flagged                   = is_flagged or (jsonb_array_length(v_reasons) > 0),
         flag_reasons                 = flag_reasons || v_reasons
  where  attendance_session_id        = v_open_session
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
    scanner_ip_address,
    scanner_device_id
  ) values (
    p_enrollment_id,
    v_session_id,
    v_type_time_out,
    v_source_id,
    v_effective_at,
    p_actor,
    v_lat,
    v_lng,
    (p_meta->>'accuracy_meter')::numeric,
    p_meta->>'device_type',
    p_meta->>'browser',
    p_meta->>'os',
    nullif(p_meta->>'ip_address', '')::inet,
    v_actor_device
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
            where code in ('voided', 'open')
          )
    where e.enrollment_status_id in (
            select enrollment_status_id from enrollment_status where code in ('active', 'completed')
          )
    group by e.enrollment_id, e.section_id
  ),
  section_stats as (
    select
      s.section_id,
      public.class_label(s.course_code, v_adviser_name, t.school_year) as section_name,
      t.is_active as term_is_active,
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
      and e.enrollment_status_id in (
            select enrollment_status_id from enrollment_status where code in ('active', 'completed')
          )
    group by s.section_id, s.course_code, s.required_hour_total, t.school_year, t.is_active
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
      and s.adviser_user_id = p_adviser_user_id
      and e.enrollment_status_id = (
            select enrollment_status_id from enrollment_status where code = 'active'
          )
    group by e.section_id
  ),
  all_classes as (
    select
      null::uuid as section_id,
      'All Classes'::text as section_name,
      (select sum(ss.total) from section_stats ss)::integer as total,
      (select coalesce(sum(pa.pending), 0) from pending_appeals pa)::integer as pending,
      (select sum(ss.completed) from section_stats ss)::integer as completed,
      least(round((select sum(ss.completed)::numeric from section_stats ss) / nullif((select sum(ss.total) from section_stats ss), 0) * 100, 2), 100) as completion_pct,
      (select sum(ss.on_track) from section_stats ss)::integer as on_track,
      (select sum(ss.at_risk) from section_stats ss)::integer as at_risk,
      (select jsonb_agg(student) from section_stats ss2, lateral jsonb_array_elements(ss2.students) as student) as students
  ),
  all_active_classes as (
    select
      null::uuid as section_id,
      'All Active Classes'::text as section_name,
      (select coalesce(sum(ss.total), 0) from section_stats ss where ss.term_is_active)::integer as total,
      (select coalesce(sum(pa.pending), 0) from pending_appeals pa)::integer as pending,
      (select coalesce(sum(ss.completed), 0) from section_stats ss where ss.term_is_active)::integer as completed,
      least(round((select sum(ss.completed)::numeric from section_stats ss where ss.term_is_active) / nullif((select sum(ss.total) from section_stats ss where ss.term_is_active), 0) * 100, 2), 100) as completion_pct,
      (select coalesce(sum(ss.on_track), 0) from section_stats ss where ss.term_is_active)::integer as on_track,
      (select coalesce(sum(ss.at_risk), 0) from section_stats ss where ss.term_is_active)::integer as at_risk,
      (select jsonb_agg(student) from section_stats ss2, lateral jsonb_array_elements(ss2.students) as student where ss2.term_is_active) as students
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
  select * from all_classes
  union all
  select * from all_active_classes;
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
  select s.section_id, public.class_label(s.course_code, v_adviser_name, t.school_year)
  from section s
  join term t on t.term_id = s.term_id
  where s.adviser_user_id = p_adviser_user_id
  order by t.start_date desc;
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
    public.class_label(s.course_code, v_adviser_name, t.school_year) as section_name,
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
  where s.adviser_user_id = p_adviser_user_id;
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
             where code in ('voided', 'open')
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
      public.class_label(s.course_code, v_adviser_name, t.school_year) as section_name,
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
    group by s.section_id, s.course_code, t.school_year
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
-- Reconciled 2026-07-12: the live definition (no auth guard, hardcoded lookup
-- UUIDs, bare course_code, missing enrollment_id/is_student_leader/
-- completion_percentage/section_geofence_id, and student_sessions that dropped
-- voided/open sessions) had drifted from this file. This version restores the
-- columns the facilitator My Students page actually consumes (enrollment_id,
-- is_student_leader, completion_percentage, section_geofence_id, and the full
-- session object incl. statusId/status/isFlagged/flagReasons/locations/geofence)
-- while keeping this file's already-correct guard, code-based lookups, and
-- class_label() section naming.
-- create or replace cannot change a return type, so the avatar_url column
-- added 2026-07-12 requires a drop before recreating.
drop function if exists public.get_my_students(uuid);

create or replace function public.get_my_students(p_adviser_user_id uuid)
returns table(
  section_id uuid, section_name text, enrollment_id uuid, student_name text,
  student_avatar_url text,
  is_student_leader boolean, student_number text, sais_id numeric,
  section_geofence_id uuid, site_location text, program text, classification text,
  status text, hours_logged numeric, total_hours integer,
  completion_percentage numeric, sessions jsonb
)
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
            where code in ('voided', 'open')
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
            'id',       att.attendance_session_id,
            'date',     to_char(att.started_at at time zone 'Asia/Manila', 'Mon DD, YYYY'),
            'timeIn',   to_char(att.started_at at time zone 'Asia/Manila', 'HH12:MI AM'),
            'timeOut',  to_char(att.ended_at at time zone 'Asia/Manila', 'HH12:MI AM'),
            'hours',    round(att.duration_minute / 60.0, 2),
            'statusId', att.attendance_session_status_id,
            'status',   atts.code,
            'isFlagged', att.is_flagged,
            'flagReasons', att.flag_reasons,
            'locations', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'eventType',     et.code,
                    'eventSource',   src.code,
                    'recordedBy',    recorder.full_name,
                    'recordedAt',    to_char(evt.effective_at at time zone 'Asia/Manila', 'HH12:MI AM'),
                    'generatedLat',  evt.generated_latitude,
                    'generatedLong', evt.generated_longitude,
                    'scanLat',       evt.scan_latitude,
                    'scanLong',      evt.scan_longitude
                  )
                  order by et.code
                ),
                '[]'::jsonb
              )
              from attendance_event evt
              join attendance_event_type et
                on et.attendance_event_type_id = evt.attendance_event_type_id
              left join attendance_event_source src
                on src.attendance_event_source_id = evt.attendance_event_source_id
              left join app_user recorder
                on recorder.app_user_id = evt.recorded_by_user_id
              where evt.attendance_session_id = att.attendance_session_id
            ),
            'geofence', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'label', g.label,
                    'centerLat', g.center_latitude,
                    'centerLong', g.center_longitude,
                    'radius', g.radius_meter
                  )
                ),
                '[]'::jsonb
              )
              from enrollment e2
              left join section_geofence g on g.section_geofence_id = e2.assigned_geofence_id
              where e2.enrollment_id = att.enrollment_id
            )
          )
          order by att.started_at
        ),
        '[]'::jsonb
      ) as sessions
    from attendance_session att
    join attendance_session_status atts
      on atts.attendance_session_status_id = att.attendance_session_status_id
    group by att.enrollment_id
  )
  select
    s.section_id,
    public.class_label(s.course_code, v_adviser_name, t.school_year) as section_name,
    e.enrollment_id as enrollment_id,
    u.full_name as student_name,
    u.avatar_url as student_avatar_url,
    e.is_student_leader as is_student_leader,
    u.student_number as student_number,
    u.sais_id::numeric as sais_id,
    g.section_geofence_id as section_geofence_id,
    g.label as site_location,
    p.name as program,
    sc.name as classification,
    case
      when round(coalesce(sm.total_minutes, 0) / 60.0, 2) >= s.required_hour_total then 'Completed'
      when round(coalesce(sm.total_minutes, 0) / 60.0, 2) > 0 then 'In Progress'
      else 'Not Started'
    end as status,
    round(coalesce(sm.total_minutes, 0) / 60.0, 2) as hours_logged,
    s.required_hour_total as total_hours,
    least(round((coalesce(sm.total_minutes, 0) / 60.0) / nullif(s.required_hour_total, 0) * 100, 2), 100) as completion_percentage,
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

-- The old 5-arg update_attendance_session overload (no correction-event write) is dead:
-- both callers use the 7-arg form. Dropped 2026-07-10 (Business Rule #5).
drop function if exists public.update_attendance_session(uuid, uuid, date, time, time);

-- Drop the dead 6-arg update overload (unused; the Edit Session UI always sends void_reason).
drop function if exists public.update_attendance_session(uuid, uuid, date, time, time, uuid);

-- update_attendance_session (7-arg) — the overload the Edit Session UI actually calls
-- (status id + void reason). Reconciled from a live-only ad-hoc definition that had NO
-- caller guard (trusted p_adviser_user_id -> IDOR) and no pinned search_path. Now guarded
-- and search_path-pinned, and it writes an append-only correction/adviser_manual event so
-- every time edit leaves an audit trail (Business Rule #5).
create or replace function public.update_attendance_session(
  p_attendance_session_id uuid,
  p_adviser_user_id uuid,
  p_session_date date,
  p_time_in time without time zone,
  p_time_out time without time zone,
  p_attendance_session_status_id uuid,
  p_void_reason text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_enrollment_id   uuid;
  v_event_source_id uuid;
  v_event_type_id   uuid;
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

  if not exists (
    select 1 from attendance_session_status
    where attendance_session_status_id = p_attendance_session_status_id
      and code in ('open', 'closed', 'voided', 'corrected')
  ) then
    raise exception 'invalid attendance session status';
  end if;

  update attendance_session
  set
    started_at = (p_session_date + p_time_in) at time zone 'Asia/Manila',
    ended_at = (p_session_date + p_time_out) at time zone 'Asia/Manila',
    attendance_session_status_id = p_attendance_session_status_id,
    void_reason = p_void_reason
  where attendance_session_id = p_attendance_session_id;

  select attt.attendance_event_type_id into v_event_type_id
  from attendance_event_type attt where attt.code = 'correction' limit 1;
  select atte.attendance_event_source_id into v_event_source_id
  from attendance_event_source atte where atte.code = 'adviser_manual' limit 1;

  insert into attendance_event (
    enrollment_id, attendance_session_id, attendance_event_type_id,
    attendance_event_source_id, effective_at, recorded_by_user_id
  )
  values (
    v_enrollment_id, p_attendance_session_id, v_event_type_id,
    v_event_source_id, now(), auth.uid()
  );
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
    'public.update_attendance_session(uuid, uuid, date, time, time, uuid, text)'
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
-- Attendance corrections/manual-add + daily auto-void.
-- These two functions previously existed ONLY on the live DB (schema drift) and
-- were written against the drifted session-status codes. Captured here and
-- reconciled to the canonical lifecycle (open/closed/voided/corrected).
-- ---------------------------------------------------------------------------

-- create_attendance_session — facilitator manually adds a completed session
-- (e.g. overnight work auto-voided at cutoff, or a forgotten re-login after a break).
-- Modelled append-only: a new session + a correction event sourced adviser_manual.
-- Returns the new attendance_session_id so callers (e.g. approving a "missing session"
-- request) can link the created session back to the request.
drop function if exists public.create_attendance_session(uuid, date, time, time);
create or replace function public.create_attendance_session(
  p_enrollment_id uuid,
  p_session_date date,
  p_time_in time without time zone,
  p_time_out time without time zone
)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_status_id       uuid;
  v_event_source_id uuid;
  v_event_type_id   uuid;
  v_new_session_id  uuid;
begin
  -- Authorization: only the enrollment's section adviser or an admin may add a session.
  if not exists (
    select 1
    from enrollment e
    join section s on s.section_id = e.section_id
    where e.enrollment_id = p_enrollment_id
      and (s.adviser_user_id = auth.uid() or public.app_is_admin())
  ) then
    raise exception 'not authorized to add a session for this enrollment';
  end if;

  select atts.attendance_session_status_id into v_status_id
  from attendance_session_status atts where atts.code = 'closed' limit 1;
  if v_status_id is null then
    raise exception 'Status code "closed" not found.';
  end if;

  select atte.attendance_event_source_id into v_event_source_id
  from attendance_event_source atte where atte.code = 'adviser_manual' limit 1;
  if v_event_source_id is null then
    raise exception 'Event source "adviser_manual" not found.';
  end if;

  select attt.attendance_event_type_id into v_event_type_id
  from attendance_event_type attt where attt.code = 'correction' limit 1;

  insert into attendance_session (
    enrollment_id, started_at, ended_at, attendance_session_status_id
  )
  values (
    p_enrollment_id,
    (p_session_date + p_time_in)  at time zone 'Asia/Manila',
    (p_session_date + p_time_out) at time zone 'Asia/Manila',
    v_status_id
  )
  returning attendance_session_id into v_new_session_id;

  insert into attendance_event (
    enrollment_id, attendance_session_id, attendance_event_type_id,
    attendance_event_source_id, effective_at, recorded_by_user_id
  )
  values (
    p_enrollment_id, v_new_session_id, v_event_type_id, v_event_source_id, now(), auth.uid()
  );

  return v_new_session_id;
end;
$function$;

-- automatic_cut_off_sessions — daily job: void sessions still 'open' past the
-- section's daily cutoff (Business Rule #1). Voided = did not complete, does not
-- count; ended_at is left null. Writes an append-only 'void'/'system_auto' event.
-- (Rewritten: the previous live version referenced non-existent time_in/time_out
--  columns, wrote to the generated duration_minute, and used undefined variables.)
create or replace function public.automatic_cut_off_sessions()
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_voided_status_id uuid;
  v_open_status_id   uuid;
  v_source_id        uuid;
  v_type_id          uuid;
begin
  select attendance_session_status_id into v_voided_status_id from attendance_session_status where code = 'voided' limit 1;
  select attendance_session_status_id into v_open_status_id   from attendance_session_status where code = 'open'   limit 1;
  select attendance_event_source_id   into v_source_id        from attendance_event_source   where code = 'system_auto' limit 1;
  select attendance_event_type_id     into v_type_id          from attendance_event_type     where code = 'void' limit 1;

  if v_voided_status_id is null or v_open_status_id is null then
    raise exception 'automatic_cut_off_sessions: required session status codes (voided/open) missing';
  end if;

  with due as (
    select att.attendance_session_id, att.enrollment_id
    from   attendance_session att
    join   enrollment e on e.enrollment_id = att.enrollment_id
    join   section     s on s.section_id   = e.section_id
    where  att.attendance_session_status_id = v_open_status_id
      and  now() > ((att.started_at at time zone 'Asia/Manila')::date + s.daily_cutoff_time) at time zone 'Asia/Manila'
  ),
  voided as (
    update attendance_session att
    set    attendance_session_status_id = v_voided_status_id,
           void_reason = 'Auto-voided: not timed out before the section daily cutoff.'
    from   due
    where  att.attendance_session_id = due.attendance_session_id
    returning att.attendance_session_id, att.enrollment_id
  )
  insert into attendance_event (
    enrollment_id, attendance_session_id, attendance_event_type_id,
    attendance_event_source_id, effective_at
  )
  select v.enrollment_id, v.attendance_session_id, v_type_id, v_source_id, now()
  from   voided v
  where  v_type_id is not null and v_source_id is not null;
end;
$function$;

-- Lock down the two functions' execute surface.
revoke execute on function public.create_attendance_session(uuid, date, time, time) from public;
revoke execute on function public.create_attendance_session(uuid, date, time, time) from anon;
grant  execute on function public.create_attendance_session(uuid, date, time, time) to authenticated;
revoke execute on function public.automatic_cut_off_sessions() from public;
revoke execute on function public.automatic_cut_off_sessions() from anon;
revoke execute on function public.automatic_cut_off_sessions() from authenticated;

-- Re-affirm the daily cutoff cron (idempotent by job name) where pg_cron is available.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('automatic-cut-off-sessions', '0 17 * * *', 'select public.automatic_cut_off_sessions();');
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
