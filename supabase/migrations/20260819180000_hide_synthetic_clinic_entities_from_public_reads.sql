-- Synthetic clinic fixtures must never be enumerated through direct public reads.
-- Keep branch members, the patient who owns a review, and platform admins able to
-- access their authorized operational rows through the explicit authenticated paths.

-- Clinics, branches, and practitioners.
drop policy if exists clinics_public_select on public.clinics;
create policy clinics_public_select
  on public.clinics
  for select
  to anon
  using (status = 'active' and not is_synthetic);

drop policy if exists clinics_authenticated_select on public.clinics;
create policy clinics_authenticated_select
  on public.clinics
  for select
  to authenticated
  using (
    (status = 'active' and not is_synthetic)
    or (select private.is_clinic_member(clinics.id, null::text[]))
    or (select private.is_platform_admin())
  );

drop policy if exists branches_public_select on public.branches;
create policy branches_public_select
  on public.branches
  for select
  to anon
  using (
    status = 'active'
    and exists (
      select 1
      from public.clinics c
      where c.id = branches.clinic_id
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists branches_authenticated_select on public.branches;
create policy branches_authenticated_select
  on public.branches
  for select
  to authenticated
  using (
    (
      status = 'active'
      and exists (
        select 1
        from public.clinics c
        where c.id = branches.clinic_id
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or (select private.has_branch_access(branches.id, null::text[]))
    or (select private.is_platform_admin())
  );

drop policy if exists practitioners_public_select on public.practitioners;
create policy practitioners_public_select
  on public.practitioners
  for select
  to anon
  using (
    active
    and exists (
      select 1
      from public.clinics c
      where c.id = practitioners.clinic_id
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists practitioners_authenticated_select on public.practitioners;
create policy practitioners_authenticated_select
  on public.practitioners
  for select
  to authenticated
  using (
    (
      active
      and exists (
        select 1
        from public.clinics c
        where c.id = practitioners.clinic_id
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or (select private.is_clinic_member(practitioners.clinic_id, null::text[]))
    or (select private.is_platform_admin())
  );

-- Branch operating hours remain public only for non-synthetic active clinics.
drop policy if exists branch_hours_anon_select on public.branch_hours;
create policy branch_hours_anon_select
  on public.branch_hours
  for select
  to anon
  using (
    exists (
      select 1
      from public.branches b
      join public.clinics c on c.id = b.clinic_id
      where b.id = branch_hours.branch_id
        and b.status = 'active'
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists branch_hours_auth_select on public.branch_hours;
create policy branch_hours_auth_select
  on public.branch_hours
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.branches b
      join public.clinics c on c.id = b.clinic_id
      where b.id = branch_hours.branch_id
        and b.status = 'active'
        and c.status = 'active'
        and not c.is_synthetic
    )
    or (select private.has_branch_access(branch_hours.branch_id, null::text[]))
  );

drop policy if exists branch_exceptions_anon_select on public.branch_hour_exceptions;
create policy branch_exceptions_anon_select
  on public.branch_hour_exceptions
  for select
  to anon
  using (
    exists (
      select 1
      from public.branches b
      join public.clinics c on c.id = b.clinic_id
      where b.id = branch_hour_exceptions.branch_id
        and b.status = 'active'
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists branch_exceptions_auth_select on public.branch_hour_exceptions;
create policy branch_exceptions_auth_select
  on public.branch_hour_exceptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.branches b
      join public.clinics c on c.id = b.clinic_id
      where b.id = branch_hour_exceptions.branch_id
        and b.status = 'active'
        and c.status = 'active'
        and not c.is_synthetic
    )
    or (select private.has_branch_access(branch_hour_exceptions.branch_id, null::text[]))
  );

-- Instant appointments must follow the visibility of their offer and branch.
drop policy if exists instant_slots_anon_select on public.instant_slots;
create policy instant_slots_anon_select
  on public.instant_slots
  for select
  to anon
  using (
    status = 'published'
    and publish_at <= now()
    and expires_at > now()
    and exists (
      select 1
      from public.branch_service_offers o
      join public.branches b on b.id = o.branch_id
      join public.clinics c on c.id = b.clinic_id
      where o.id = instant_slots.offer_id
        and o.status = 'active'
        and o.effective_from <= now()
        and (o.effective_to is null or o.effective_to > now())
        and b.status = 'active'
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists instant_slots_auth_select on public.instant_slots;
create policy instant_slots_auth_select
  on public.instant_slots
  for select
  to authenticated
  using (
    (
      status = 'published'
      and publish_at <= now()
      and expires_at > now()
      and exists (
        select 1
        from public.branch_service_offers o
        join public.branches b on b.id = o.branch_id
        join public.clinics c on c.id = b.clinic_id
        where o.id = instant_slots.offer_id
          and o.status = 'active'
          and o.effective_from <= now()
          and (o.effective_to is null or o.effective_to > now())
          and b.status = 'active'
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or exists (
      select 1
      from public.availability_slots s
      where s.id = instant_slots.slot_id
        and (select private.has_branch_access(s.branch_id, null::text[]))
    )
  );

-- Published reviews must not expose a synthetic clinic through a direct table read.
drop policy if exists reviews_anon_select on public.reviews;
create policy reviews_anon_select
  on public.reviews
  for select
  to anon
  using (
    status = 'published'
    and exists (
      select 1
      from public.clinics c
      where c.id = reviews.clinic_id
        and c.status = 'active'
        and not c.is_synthetic
    )
  );

drop policy if exists reviews_auth_select on public.reviews;
create policy reviews_auth_select
  on public.reviews
  for select
  to authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1
        from public.clinics c
        where c.id = reviews.clinic_id
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or patient_id = (select auth.uid())
    or (select private.is_clinic_member(reviews.clinic_id, null::text[]))
    or (select private.is_platform_admin())
  );
