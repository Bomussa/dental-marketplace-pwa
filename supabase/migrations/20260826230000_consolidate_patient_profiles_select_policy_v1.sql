-- Consolidate the authenticated SELECT policy so archived patients cannot retain self access
-- through an older permissive policy, while authorised clinic booking access remains unchanged.

drop policy if exists patient_profiles_select_own on public.patient_profiles;
drop policy if exists patient_profiles_authenticated_select on public.patient_profiles;

create policy patient_profiles_authenticated_select
  on public.patient_profiles
  for select
  to authenticated
  using (
    (
      account_id = (select auth.uid())
      and archived_at is null
    )
    or exists (
      select 1
      from public.bookings b
      where b.patient_profile_id = patient_profiles.id
        and private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])
    )
  );
