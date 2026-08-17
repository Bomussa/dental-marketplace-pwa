-- Resolve post-migration RLS advisor findings without widening patient-data access.

create policy patient_phone_verification_challenges_no_client_access
  on public.patient_phone_verification_challenges
  for all
  to authenticated
  using (false)
  with check (false);

-- Operational clinic staff may read only the profiles tied to bookings in their authorized branches.
-- Pricing and viewer roles remain excluded by the explicit role list.
drop policy if exists patient_profiles_select_operational_booking on public.patient_profiles;
create policy patient_profiles_select_operational_booking
  on public.patient_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.patient_profile_id = patient_profiles.id
        and private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])
    )
  );

-- This function now runs with the caller's RLS rights. The preceding policy grants only the minimum
-- operational disclosure needed by an authorized branch, removing the externally callable definer path.
create or replace function public.clinic_booking_patient_details(p_booking_ids uuid[] default null)
returns table(
  booking_id uuid,
  patient_display_name text,
  patient_relationship text,
  patient_national_id text,
  patient_nationality text,
  patient_date_of_birth date,
  patient_phone text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    b.id,
    pp.display_name,
    pp.relationship,
    pp.national_id,
    pp.nationality,
    pp.date_of_birth,
    pp.phone
  from public.bookings b
  join public.patient_profiles pp on pp.id = b.patient_profile_id
  where private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])
    and (p_booking_ids is null or b.id = any(p_booking_ids));
$$;

revoke all on function public.clinic_booking_patient_details(uuid[]) from public, anon;
grant execute on function public.clinic_booking_patient_details(uuid[]) to authenticated;
