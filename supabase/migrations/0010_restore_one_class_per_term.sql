-- Restore one class per facilitator per term.
-- Safe if the multi-type index from the short-lived 0010 change was applied;
-- no-op if uq_section_adviser_term already exists.

drop index if exists uq_section_adviser_term_nstp_type;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_section_adviser_term'
      and conrelid = 'section'::regclass
  ) then
    alter table section
      add constraint uq_section_adviser_term unique (adviser_user_id, term_id);
  end if;
end $$;

-- ============================================================
-- merge_class_into — reassign-with-merge (2026-07-17).
--
-- uq_section_adviser_term (above) means a facilitator can never advise two
-- classes in the same term, so reassigning a class TO a facilitator who
-- already has a class that term can only proceed as a MERGE: the source
-- class's roster (and its sites / section-scoped form requirements) fold
-- into the target class, and the emptied source class is deleted. Plain
-- reassignment (target has no class this term) stays a simple
-- `update section set adviser_user_id = ...` in lib/admin/class-reassign.ts
-- and does not call this function.
--
-- Called by reassignClass() (lib/admin/class-reassign.ts) via the service
-- client; the admin-role gate lives in the server action
-- (reassignClassAction, lib/admin/adviser-list-actions.ts). Write RPC →
-- security definer, EXECUTE revoked from public/anon/authenticated
-- (service-role only), matching the hardening pattern in 0005_leader_qr.sql.
--
-- p_keep_leader_enrollment_ids: enrollment ids that KEEP is_student_leader
--   after the merge. NULL = keep every current leader on both sides (no
--   demotions); [] = demote all. Multiple leaders per class are allowed
--   (update_student_role already just toggles the flag with no
--   single-leader enforcement) — this is the admin's checkbox selection
--   from the merge preview UI.
--
-- Duplicate-student handling (a student enrolled in BOTH classes): the
-- ACTIVE row is kept (both-active is impossible — enforce_one_active_enrollment);
-- if neither is active, the target-side row is kept. The loser row's
-- attendance_session / attendance_event / appeal / form_submission rows are
-- re-parented onto the keeper (attendance_event via the narrow GUC-gated
-- exception in block_attendance_event_mutation(), 0001_schema.sql), then the
-- loser enrollment is deleted (its qr_current_token cascades). This is a
-- structural re-parent of the FK, not an edit to event content/timestamps.
-- ============================================================
create or replace function public.merge_class_into(
  p_source_section_id uuid,
  p_target_section_id uuid,
  p_keep_leader_enrollment_ids uuid[],
  p_actor_user_id uuid
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_source section%rowtype;
  v_target section%rowtype;
  v_target_adviser record;
  v_source_type text;
  v_target_type text;
  v_active_status_id uuid;
  v_keep_ids uuid[] := p_keep_leader_enrollment_ids;
  v_dup record;
  v_sub record;
  v_keeper_id uuid;
  v_loser_id uuid;
  v_loser_leader boolean;
  v_dup_names jsonb := '[]'::jsonb;
  v_removed_paths jsonb := '[]'::jsonb;
  v_geofences_moved int := 0;
  v_requirements_moved int := 0;
  v_moved_count int := 0;
  v_leaders_demoted int := 0;
  v_leaders_kept int := 0;
  v_target_label text;
  v_summary jsonb;
begin
  -- ---- validate & lock ----------------------------------------------------
  select * into v_source from section where section_id = p_source_section_id for update;
  if not found then
    raise exception 'Source class not found.';
  end if;
  select * into v_target from section where section_id = p_target_section_id for update;
  if not found then
    raise exception 'Target class not found.';
  end if;
  if p_source_section_id = p_target_section_id then
    raise exception 'Source and target class are the same.';
  end if;
  if v_source.term_id <> v_target.term_id then
    raise exception 'The two classes belong to different terms.';
  end if;
  if (select code from section_status where section_status_id = v_source.section_status_id) <> 'active'
     or (select code from section_status where section_status_id = v_target.section_status_id) <> 'active' then
    raise exception 'Both classes must be active to merge.';
  end if;

  select u.full_name, u.is_active, r.code as role_code
    into v_target_adviser
    from app_user u
    join role r on r.role_id = u.role_id
   where u.app_user_id = v_target.adviser_user_id;
  if v_target_adviser.role_code not in ('adviser', 'admin') or not v_target_adviser.is_active then
    raise exception 'Target facilitator is not an active facilitator or admin account.';
  end if;

  v_source_type := upper(trim(substring(v_source.course_code from '\S+$')));
  v_target_type := upper(trim(substring(v_target.course_code from '\S+$')));
  if v_source_type is distinct from v_target_type then
    raise exception 'Classes are different NSTP components (% vs %).', v_source_type, v_target_type;
  end if;

  select enrollment_status_id into v_active_status_id
    from enrollment_status where code = 'active';

  -- allow attendance_event re-parenting for THIS transaction only (see 0001_schema.sql)
  perform set_config('nstp.merge_reparent', 'on', true);

  -- ---- 1) sites first (keeps enrollment.assigned_geofence_id valid under
  --         enrollment_geofence_section_match once enrollments move below) ---
  update section_geofence set section_id = p_target_section_id
   where section_id = p_source_section_id;
  get diagnostics v_geofences_moved = row_count;

  -- ---- 2) section-scoped form requirements ---------------------------------
  update form_requirement set section_id = p_target_section_id
   where section_id = p_source_section_id;
  get diagnostics v_requirements_moved = row_count;

  -- ---- 3) exclusions: dedupe against the target, then move the rest -------
  delete from form_requirement_exclusion src
   where src.section_id = p_source_section_id
     and exists (
       select 1 from form_requirement_exclusion tgt
        where tgt.section_id = p_target_section_id
          and tgt.form_requirement_id = src.form_requirement_id
     );
  update form_requirement_exclusion set section_id = p_target_section_id
   where section_id = p_source_section_id;

  -- ---- 4) legacy form table (documented empty; defensive only) ------------
  update form set section_id = p_target_section_id
   where section_id = p_source_section_id;

  -- ---- 5) duplicate students (enrolled in BOTH classes) --------------------
  for v_dup in
    select s.enrollment_id as source_id,
           (s.enrollment_status_id = v_active_status_id) as source_active,
           s.is_student_leader as source_leader,
           t.enrollment_id as target_id,
           t.is_student_leader as target_leader,
           u.full_name
      from enrollment s
      join enrollment t on t.student_user_id = s.student_user_id
                       and t.section_id = p_target_section_id
      join app_user u on u.app_user_id = s.student_user_id
     where s.section_id = p_source_section_id
       for update of s, t
  loop
    -- keeper = the active row; if neither is active, keep the target row
    if v_dup.source_active then
      v_keeper_id := v_dup.source_id;
      v_loser_id := v_dup.target_id;
      v_loser_leader := v_dup.target_leader;
    else
      v_keeper_id := v_dup.target_id;
      v_loser_id := v_dup.source_id;
      v_loser_leader := v_dup.source_leader;
    end if;

    update attendance_session set enrollment_id = v_keeper_id
     where enrollment_id = v_loser_id;
    update attendance_event set enrollment_id = v_keeper_id
     where enrollment_id = v_loser_id;                        -- via GUC hatch above
    update appeal set enrollment_id = v_keeper_id
     where enrollment_id = v_loser_id;

    -- form_submission: keep the newer submission per requirement, remember
    -- the deleted row's storage_path so the caller can clean up the bucket.
    for v_sub in
      select l.form_submission_id as l_id, l.storage_path as l_path, l.submitted_at as l_at,
             k.form_submission_id as k_id, k.storage_path as k_path, k.submitted_at as k_at
        from form_submission l
        join form_submission k on k.form_requirement_id = l.form_requirement_id
                               and k.enrollment_id = v_keeper_id
       where l.enrollment_id = v_loser_id
    loop
      if v_sub.l_at > v_sub.k_at then
        delete from form_submission where form_submission_id = v_sub.k_id;
        if v_sub.k_path is not null then
          v_removed_paths := v_removed_paths || to_jsonb(v_sub.k_path);
        end if;
      else
        delete from form_submission where form_submission_id = v_sub.l_id;
        if v_sub.l_path is not null then
          v_removed_paths := v_removed_paths || to_jsonb(v_sub.l_path);
        end if;
      end if;
    end loop;
    update form_submission set enrollment_id = v_keeper_id
     where enrollment_id = v_loser_id;

    delete from enrollment where enrollment_id = v_loser_id;   -- qr_current_token cascades

    if v_loser_leader then
      update enrollment set is_student_leader = true
       where enrollment_id = v_keeper_id and not is_student_leader;
    end if;
    if v_keep_ids is not null and v_loser_id = any(v_keep_ids) then
      v_keep_ids := array_append(v_keep_ids, v_keeper_id);
    end if;
    v_dup_names := v_dup_names || to_jsonb(v_dup.full_name);
  end loop;

  -- ---- 6) bulk move every remaining enrollment (all statuses) -------------
  update enrollment set section_id = p_target_section_id
   where section_id = p_source_section_id;
  get diagnostics v_moved_count = row_count;

  -- ---- 7) apply the admin's leader selection (NULL keep-list = keep all) --
  if v_keep_ids is not null then
    update enrollment
       set is_student_leader = false
     where section_id = p_target_section_id
       and is_student_leader
       and not (enrollment_id = any(v_keep_ids));
    get diagnostics v_leaders_demoted = row_count;
  end if;
  select count(*) into v_leaders_kept from enrollment
   where section_id = p_target_section_id and is_student_leader;

  -- ---- 8) delete the emptied source class ----------------------------------
  delete from section where section_id = p_source_section_id;

  v_target_label := public.class_label(
    v_target.course_code,
    v_target_adviser.full_name,
    (select school_year from term where term_id = v_target.term_id)
  );

  v_summary := jsonb_build_object(
    'moved_student_count', v_moved_count,
    'merged_duplicate_names', v_dup_names,
    'leaders_kept', v_leaders_kept,
    'leaders_demoted', v_leaders_demoted,
    'geofences_moved', v_geofences_moved,
    'requirements_moved', v_requirements_moved,
    'removed_submission_storage_paths', v_removed_paths,
    'target_class_label', v_target_label
  );

  -- section has no audit trigger of its own — record the merge/deletion explicitly
  insert into audit_log (actor_user_id, table_name, record_id, action, old_data, new_data)
  values (
    p_actor_user_id, 'section', p_source_section_id, 'DELETE',
    to_jsonb(v_source) || jsonb_build_object('merge_summary', v_summary), null
  );

  return v_summary;
end;
$$;

revoke execute on function public.merge_class_into(uuid, uuid, uuid[], uuid) from public;
revoke execute on function public.merge_class_into(uuid, uuid, uuid[], uuid) from anon, authenticated;
