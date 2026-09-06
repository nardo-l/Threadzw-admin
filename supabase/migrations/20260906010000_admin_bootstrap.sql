-- ThreadZW Mission Control: one-time admin bootstrap
-- This does NOT interfere with existing seller accounts in auth.users.
-- The first account created through the admin bootstrap flow becomes super_admin.
-- Once an admin exists, the bootstrap RPC refuses all further bootstrap attempts.

create or replace function public.claim_first_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serialize bootstrap attempts so two simultaneous requests cannot both win.
  perform pg_advisory_xact_lock(hashtext('threadzw-first-admin-bootstrap'));

  if exists (select 1 from public.admin_roles where active = true) then
    return false;
  end if;

  insert into public.admin_roles (user_id, role, active)
  values (p_user_id, 'super_admin', true);

  return true;
end;
$$;

revoke all on function public.claim_first_admin(uuid) from public, anon, authenticated;
grant execute on function public.claim_first_admin(uuid) to service_role;
