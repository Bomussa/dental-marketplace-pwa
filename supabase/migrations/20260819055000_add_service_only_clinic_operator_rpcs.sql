-- Service-only RPCs receive the verified actor ID from server-side application code.
-- They are not executable by anon or authenticated API roles.

create or replace function public.provision_clinic_operator_account_server(
  p_actor_id uuid,
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
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.clinics where id = p_clinic_id for update;
  if not found then raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002'; end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator') then
    raise exception 'INVALID_OPERATOR_ACCOUNT' using errcode = '22023';
  end if;

  select candidate.slot_no into v_slot
  from (values (1::smallint), (2::smallint)) as candidate(slot_no)
  where not exists (
    select 1 from public.clinic_operator_accounts existing
    where existing.clinic_id = p_clinic_id and existing.slot_no = candidate.slot_no and existing.revoked_at is null
  )
  order by candidate.slot_no limit 1;
  if v_slot is null then raise exception 'CLINIC_OPERATOR_LIMIT_REACHED' using errcode = 'P0001'; end if;

  insert into public.account_usernames(user_id, username) values (p_user_id, p_username);
  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (p_user_id, p_clinic_id, null, 'manager', 'active') returning id into v_membership_id;
  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, p_actor_id) returning id into v_operator_account_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, p_actor_id, 'created');
  return v_operator_account_id;
end;
$$;

create or replace function public.list_clinic_operator_accounts_server(p_actor_id uuid, p_clinic_id uuid)
returns table(operator_account_id uuid, user_id uuid, username text, slot_no smallint, status text, created_at timestamptz, revoked_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select operator.id, operator.user_id, account_username.username, operator.slot_no, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.account_usernames account_username on account_username.user_id = operator.user_id
  join public.clinic_memberships membership on membership.id = operator.membership_id
  where operator.clinic_id = p_clinic_id
  order by operator.slot_no, operator.created_at;
end;
$$;

create or replace function public.revoke_clinic_operator_account_server(p_actor_id uuid, p_operator_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator from public.clinic_operator_accounts where id = p_operator_account_id and revoked_at is null for update;
  if not found then raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.clinic_operator_accounts set revoked_at = now() where id = v_operator.id;
  update public.clinic_memberships set status = 'revoked' where id = v_operator.membership_id;
  update public.account_usernames set disabled_at = now() where user_id = v_operator.user_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'revoked');
end;
$$;

create or replace function public.audit_clinic_operator_password_reset_server(p_actor_id uuid, p_operator_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator from public.clinic_operator_accounts where id = p_operator_account_id and revoked_at is null;
  if not found then raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'password_reset');
end;
$$;

revoke all on function public.provision_clinic_operator_account_server(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.provision_clinic_operator_account_server(uuid, uuid, uuid, text) to service_role;
revoke all on function public.list_clinic_operator_accounts_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_clinic_operator_accounts_server(uuid, uuid) to service_role;
revoke all on function public.revoke_clinic_operator_account_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_clinic_operator_account_server(uuid, uuid) to service_role;
revoke all on function public.audit_clinic_operator_password_reset_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.audit_clinic_operator_password_reset_server(uuid, uuid) to service_role;
