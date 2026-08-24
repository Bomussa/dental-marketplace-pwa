-- Super-admin provisioning for a bookings-only operational client.
-- Passwords remain exclusively in Supabase Auth; this migration stores no password material.

create or replace function private.is_platform_super_admin_for_actor(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
    and coalesce((u.raw_app_meta_data ->> 'platform_super_admin')::boolean, false)
  from auth.users u
  where u.id = p_actor_id
$$;

revoke all on function private.is_platform_super_admin_for_actor(uuid) from public;

create or replace function public.provision_operational_client_account_server(
  p_actor_id uuid,
  p_clinic_id uuid,
  p_branch_id uuid,
  p_user_id uuid,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id and clinic_id = p_clinic_id) then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator'
      and u.raw_app_meta_data ->> 'access_scope' = 'clinic_bookings_only'
  ) then
    raise exception 'INVALID_OPERATIONAL_CLIENT' using errcode = '22023';
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
  values (p_user_id, p_clinic_id, p_branch_id, 'receptionist', 'active')
  returning id into v_membership_id;

  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, p_actor_id)
  returning id into v_operator_account_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, p_actor_id, 'created');

  return v_operator_account_id;
end;
$$;

revoke all on function public.provision_operational_client_account_server(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.provision_operational_client_account_server(uuid, uuid, uuid, uuid, text) to service_role;
