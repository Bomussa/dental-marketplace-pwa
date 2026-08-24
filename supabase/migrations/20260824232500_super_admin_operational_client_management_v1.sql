-- Super-admin list/revoke operations for bookings-only operational clients.

create or replace function public.list_operational_client_accounts_server(p_actor_id uuid)
returns table(
  operator_account_id uuid,
  user_id uuid,
  username text,
  clinic_id uuid,
  clinic_name text,
  branch_id uuid,
  branch_name text,
  status text,
  created_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select operator.id, operator.user_id, username_row.username, operator.clinic_id, clinic.display_name,
    membership.branch_id, branch.name, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.clinic_memberships membership on membership.id = operator.membership_id
  join public.account_usernames username_row on username_row.user_id = operator.user_id
  join public.clinics clinic on clinic.id = operator.clinic_id
  join public.branches branch on branch.id = membership.branch_id
  join auth.users auth_user on auth_user.id = operator.user_id
  where membership.role = 'receptionist'
    and auth_user.raw_app_meta_data ->> 'access_scope' = 'clinic_bookings_only'
  order by operator.revoked_at nulls first, operator.created_at desc;
end;
$$;

create or replace function public.revoke_operational_client_account_server(
  p_actor_id uuid,
  p_operator_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.clinic_operator_accounts%rowtype;
  v_role text;
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select operator.* into v_operator
  from public.clinic_operator_accounts operator
  where operator.id = p_operator_account_id and operator.revoked_at is null
  for update;
  if not found then
    raise exception 'OPERATIONAL_CLIENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select role into v_role from public.clinic_memberships where id = v_operator.membership_id for update;
  if v_role is distinct from 'receptionist' then
    raise exception 'INVALID_OPERATIONAL_CLIENT' using errcode = '22023';
  end if;

  update public.clinic_operator_accounts set revoked_at = now() where id = v_operator.id;
  update public.clinic_memberships set status = 'revoked' where id = v_operator.membership_id;
  update public.account_usernames set disabled_at = now() where user_id = v_operator.user_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'revoked');
end;
$$;

revoke all on function public.list_operational_client_accounts_server(uuid) from public, anon, authenticated;
grant execute on function public.list_operational_client_accounts_server(uuid) to service_role;
revoke all on function public.revoke_operational_client_account_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_operational_client_account_server(uuid, uuid) to service_role;
