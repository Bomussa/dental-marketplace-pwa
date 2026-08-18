-- Username/password accounts and two managed operator accounts per clinic.
-- Passwords remain exclusively inside Supabase Auth; this schema stores no password material.

create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  disabled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_usernames_format_check check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$')
);

create unique index if not exists account_usernames_normalized_unique
  on public.account_usernames (lower(username));

alter table public.account_usernames enable row level security;
revoke all on table public.account_usernames from anon, authenticated;

create or replace function private.touch_account_username_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_account_username_updated_at() from public;

drop trigger if exists account_usernames_touch_updated_at on public.account_usernames;
create trigger account_usernames_touch_updated_at
before update on public.account_usernames
for each row execute function private.touch_account_username_updated_at();

create table if not exists public.clinic_operator_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null references public.clinic_memberships(id) on delete restrict,
  slot_no smallint not null check (slot_no in (1, 2)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create unique index if not exists clinic_operator_accounts_active_slot_unique
  on public.clinic_operator_accounts (clinic_id, slot_no)
  where revoked_at is null;

create unique index if not exists clinic_operator_accounts_active_user_unique
  on public.clinic_operator_accounts (user_id)
  where revoked_at is null;

create index if not exists clinic_operator_accounts_clinic_created_idx
  on public.clinic_operator_accounts (clinic_id, created_at desc);

alter table public.clinic_operator_accounts enable row level security;
revoke all on table public.clinic_operator_accounts from anon, authenticated;

create table if not exists public.clinic_operator_account_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  operator_account_id uuid references public.clinic_operator_accounts(id) on delete set null,
  operator_user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'password_reset', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists clinic_operator_account_events_clinic_created_idx
  on public.clinic_operator_account_events (clinic_id, created_at desc);

alter table public.clinic_operator_account_events enable row level security;
revoke all on table public.clinic_operator_account_events from anon, authenticated;

-- Clinic-only accounts must never acquire a patient profile simply because an auth user exists.
create or replace function public.handle_new_account_patient_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', 'patient') = 'clinic_operator' then
    return new;
  end if;

  insert into public.patient_profiles(account_id, display_name, relationship)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'أنا'),
    'self'
  )
  on conflict (account_id) where relationship = 'self' and archived_at is null do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_account_patient_profile() from public;

create or replace function public.provision_clinic_operator_account(
  p_clinic_id uuid,
  p_user_id uuid,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.clinics where id = p_clinic_id for update;
  if not found then
    raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator'
  ) then
    raise exception 'INVALID_OPERATOR_ACCOUNT' using errcode = '22023';
  end if;

  select candidate.slot_no into v_slot
  from (values (1::smallint), (2::smallint)) as candidate(slot_no)
  where not exists (
    select 1
    from public.clinic_operator_accounts existing
    where existing.clinic_id = p_clinic_id
      and existing.slot_no = candidate.slot_no
      and existing.revoked_at is null
  )
  order by candidate.slot_no
  limit 1;

  if v_slot is null then
    raise exception 'CLINIC_OPERATOR_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.account_usernames(user_id, username)
  values (p_user_id, p_username);

  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (p_user_id, p_clinic_id, null, 'manager', 'active')
  returning id into v_membership_id;

  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, v_actor_id)
  returning id into v_operator_account_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, v_actor_id, 'created');

  return v_operator_account_id;
end;
$$;

revoke all on function public.provision_clinic_operator_account(uuid, uuid, text) from public;
grant execute on function public.provision_clinic_operator_account(uuid, uuid, text) to authenticated;

create or replace function public.list_clinic_operator_accounts(p_clinic_id uuid)
returns table (
  operator_account_id uuid,
  user_id uuid,
  username text,
  slot_no smallint,
  status text,
  created_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or not private.has_clinic_role_for_actor(auth.uid(), p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select operator.id, operator.user_id, username.username, operator.slot_no, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.account_usernames username on username.user_id = operator.user_id
  join public.clinic_memberships membership on membership.id = operator.membership_id
  where operator.clinic_id = p_clinic_id
  order by operator.slot_no, operator.created_at;
end;
$$;

revoke all on function public.list_clinic_operator_accounts(uuid) from public;
grant execute on function public.list_clinic_operator_accounts(uuid) to authenticated;

create or replace function public.revoke_clinic_operator_account(p_operator_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator
  from public.clinic_operator_accounts
  where id = p_operator_account_id
    and revoked_at is null
  for update;

  if not found then
    raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.clinic_operator_accounts
  set revoked_at = now()
  where id = v_operator.id;

  update public.clinic_memberships
  set status = 'revoked'
  where id = v_operator.membership_id;

  update public.account_usernames
  set disabled_at = now()
  where user_id = v_operator.user_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, v_actor_id, 'revoked');
end;
$$;

revoke all on function public.revoke_clinic_operator_account(uuid) from public;
grant execute on function public.revoke_clinic_operator_account(uuid) to authenticated;

create or replace function public.audit_clinic_operator_password_reset(p_operator_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator
  from public.clinic_operator_accounts
  where id = p_operator_account_id
    and revoked_at is null;

  if not found then
    raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, v_actor_id, 'password_reset');
end;
$$;

revoke all on function public.audit_clinic_operator_password_reset(uuid) from public;
grant execute on function public.audit_clinic_operator_password_reset(uuid) to authenticated;
