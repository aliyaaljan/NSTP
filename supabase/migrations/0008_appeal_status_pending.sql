-- Align appeal_status initial-state code with application layer (pending, not open).

update public.appeal_status
set code = 'pending', name = 'Pending'
where code = 'open';

drop policy if exists appeal_insert_self on public.appeal;

create policy appeal_insert_self on public.appeal for insert to authenticated
  with check (
    requester_user_id = (select auth.uid())
    and exists (select 1 from public.enrollment e
                where e.enrollment_id = appeal.enrollment_id and e.student_user_id = (select auth.uid()))
    and assigned_adviser_user_id is null
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
      and appe.assigned_adviser_user_id = p_adviser_user_id
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
