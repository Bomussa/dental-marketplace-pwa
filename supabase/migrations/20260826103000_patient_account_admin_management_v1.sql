-- Minimal, server-only patient account inventory for platform administration.
-- It exposes no national ID, phone number, email, booking, or notification content.

create or replace function public.list_patient_accounts_for_admin(
  p_actor_id uuid,
  p_limit integer default 50
)
returns table(
  user_id uuid,
  display_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not private.is_platform_admin_for_actor(p_actor_id) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    pp.account_id,
    pp.display_name,
    pp.created_at
  from public.patient_profiles pp
  join auth.users u on u.id = pp.account_id
  where pp.relationship = 'self'
    and pp.archived_at is null
    and coalesce(u.raw_user_meta_data ->> 'account_kind', 'patient') = 'patient'
    and coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false) = false
  order by pp.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

revoke all on function public.list_patient_accounts_for_admin(uuid, integer) from public, anon, authenticated;
grant execute on function public.list_patient_accounts_for_admin(uuid, integer) to service_role;
