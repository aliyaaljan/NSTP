-- ============================================================
-- NSTP Hours Tracker — Custom access token (JWT) hook
--
-- Stamps the user's role code and permission codes into every
-- JWT issued by Supabase Auth. Middleware and server routes
-- read auth.jwt() instead of querying the DB per request.
--
-- After applying this migration, enable the hook ONCE manually
-- in the Supabase Dashboard:
--   Authentication → Hooks → Customize Access Token (JWT) Claims
--   → select function: public.custom_access_token_hook
-- ============================================================

-- ============================================================
-- Remove legacy role mirror into user_metadata.
-- raw_user_meta_data is user-writable (updateUser API), so
-- stamping role there creates a privilege-escalation surface.
-- The JWT hook below stamps user_role into claims instead.
-- ============================================================
drop trigger if exists sync_user on public.app_user;
drop function if exists public.sync_user_role_to_metadata();
update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'role'
  where raw_user_meta_data ? 'role';

-- ============================================================
-- UP-email signup gate — codify the trigger that only existed
-- in prod outside of version-controlled migrations.
-- ============================================================
create or replace function public.check_up_email_domain()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.email is null or not (new.email ilike '%@up.edu.ph') then
    raise exception 'Access Denied: Only official UP email accounts (@up.edu.ph) are allowed.';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_up_email_domain() from public, anon, authenticated;

drop trigger if exists enforce_up_email_domain_on_signup on auth.users;
create trigger enforce_up_email_domain_on_signup
  before insert on auth.users
  for each row execute function public.check_up_email_domain();

-- ============================================================
-- JWT claims hook
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable set search_path = public, pg_temp as $$
declare
  claims  jsonb;
  v_role  text;
  v_perms jsonb;
begin
  select r.code into v_role
  from public.app_user u
  join public.role r on r.role_id = u.role_id
  where u.app_user_id = (event->>'user_id')::uuid;

  select coalesce(jsonb_agg(p.code order by p.code), '[]'::jsonb) into v_perms
  from public.app_user u
  join public.role_permission rp on rp.role_id = u.role_id
  join public.permission p       on p.permission_id = rp.permission_id
  where u.app_user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}',   coalesce(to_jsonb(v_role), 'null'::jsonb));
  claims := jsonb_set(claims, '{permissions}', coalesce(v_perms, '[]'::jsonb));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Only supabase_auth_admin may invoke the hook
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- supabase_auth_admin runs without RLS; grant SELECT so it can resolve roles/permissions
grant select on public.app_user        to supabase_auth_admin;
grant select on public.role            to supabase_auth_admin;
grant select on public.role_permission to supabase_auth_admin;
grant select on public.permission      to supabase_auth_admin;

-- Permissive SELECT policies scoped to supabase_auth_admin (combined with the GRANTs above)
create policy auth_admin_read_app_user on public.app_user
  for select to supabase_auth_admin using (true);

create policy auth_admin_read_role on public.role
  for select to supabase_auth_admin using (true);

create policy auth_admin_read_role_permission on public.role_permission
  for select to supabase_auth_admin using (true);

create policy auth_admin_read_permission on public.permission
  for select to supabase_auth_admin using (true);
