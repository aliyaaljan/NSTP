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
