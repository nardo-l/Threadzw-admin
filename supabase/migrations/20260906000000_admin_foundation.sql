create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','operations_admin','support_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  admin_role text not null,
  action text not null,
  target_type text,
  target_id uuid,
  reason text,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_roles_active on public.admin_roles(active) where active = true;
create index if not exists idx_admin_audit_created_at on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_target on public.admin_audit_logs(target_type, target_id);

alter table public.admin_roles enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Do not grant ordinary authenticated users access. Admin API uses the service role
-- after independently verifying the caller's JWT and admin_roles record.
revoke all on public.admin_roles from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = p_user_id and active = true
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
