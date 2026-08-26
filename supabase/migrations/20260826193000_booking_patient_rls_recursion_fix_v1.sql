-- Break the RLS recursion between public.bookings and public.patient_profiles.
-- The self-patient archival guard stays enforced through a non-exposed SECURITY DEFINER helper,
-- while operational branch and platform-admin authorization paths remain unchanged.

create or replace function private.has_active_self_patient_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_profiles pp
    where pp.account_id = p_user_id
      and pp.relationship = 'self'
      and pp.archived_at is null
  );
$$;

revoke all on function private.has_active_self_patient_profile(uuid) from public, anon, authenticated;
grant execute on function private.has_active_self_patient_profile(uuid) to authenticated;

drop policy if exists bookings_select on public.bookings;
create policy bookings_select
  on public.bookings
  for select
  using (
    (
      booked_by_user_id = (select auth.uid())
      and private.has_active_self_patient_profile((select auth.uid()))
    )
    or (select private.has_branch_access(bookings.branch_id, null::text[]))
    or (select private.is_platform_admin())
  );
