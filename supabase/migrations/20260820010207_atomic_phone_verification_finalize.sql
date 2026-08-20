create or replace function public.complete_patient_phone_verification_server(
  p_actor_id uuid,
  p_challenge_id uuid,
  p_patient_profile_id uuid
)
returns table(profile_id uuid, verified_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge record;
  v_profile_id uuid;
  v_verified_at timestamptz;
begin
  if p_actor_id is null or p_challenge_id is null or p_patient_profile_id is null then
    raise exception 'verified actor, challenge, and profile are required' using errcode = '22023';
  end if;

  select c.account_id, c.patient_profile_id, c.phone, c.status, c.consumed_at
  into v_challenge
  from public.patient_phone_verification_challenges c
  where c.id = p_challenge_id
  for update;

  if not found then
    raise exception 'verification challenge not found' using errcode = 'P0002';
  end if;

  if v_challenge.account_id <> p_actor_id or v_challenge.patient_profile_id <> p_patient_profile_id then
    raise exception 'verification challenge is not authorized for this profile' using errcode = '42501';
  end if;

  if v_challenge.status = 'verified' then
    select p.id, p.phone_verified_at
    into v_profile_id, v_verified_at
    from public.patient_profiles p
    where p.id = p_patient_profile_id
      and p.account_id = p_actor_id
      and p.phone = v_challenge.phone
      and p.archived_at is null;

    if not found or v_verified_at is null then
      raise exception 'verified challenge is inconsistent with patient profile' using errcode = '55000';
    end if;

    return query select v_profile_id, v_verified_at;
    return;
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'verification challenge is not pending' using errcode = '55000';
  end if;

  v_verified_at := now();

  update public.patient_profiles p
  set phone_verified_at = v_verified_at
  where p.id = p_patient_profile_id
    and p.account_id = p_actor_id
    and p.phone = v_challenge.phone
    and p.archived_at is null
  returning p.id into v_profile_id;

  if not found then
    raise exception 'patient profile no longer matches verification challenge' using errcode = '55000';
  end if;

  update public.patient_phone_verification_challenges c
  set status = 'verified', consumed_at = v_verified_at
  where c.id = p_challenge_id
    and c.account_id = p_actor_id
    and c.patient_profile_id = p_patient_profile_id
    and c.status = 'pending';

  if not found then
    raise exception 'verification challenge changed concurrently' using errcode = '40001';
  end if;

  return query select v_profile_id, v_verified_at;
end;
$$;

revoke execute on function public.complete_patient_phone_verification_server(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_patient_phone_verification_server(uuid, uuid, uuid) to service_role;
