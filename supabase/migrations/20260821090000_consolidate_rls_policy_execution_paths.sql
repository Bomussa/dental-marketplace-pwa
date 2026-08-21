-- Consolidate overlapping permissive RLS policies without changing the effective access set.
-- The platform-admin ALL policies are expanded into action-specific predicates so PostgreSQL
-- evaluates one policy per authenticated action rather than OR-ing multiple permissive policies.

-- Treatment catalogue and exact variants: active records remain readable to authenticated users;
-- platform administrators retain every mutation right through distinct write policies.
drop policy if exists treatment_catalog_platform_admin_all on public.treatment_catalog;
create policy treatment_catalog_platform_admin_insert
  on public.treatment_catalog for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy treatment_catalog_platform_admin_update
  on public.treatment_catalog for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
create policy treatment_catalog_platform_admin_delete
  on public.treatment_catalog for delete to authenticated
  using ((select private.is_platform_admin()));

drop policy if exists treatment_variants_platform_admin_all on public.treatment_variants;
create policy treatment_variants_platform_admin_insert
  on public.treatment_variants for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy treatment_variants_platform_admin_update
  on public.treatment_variants for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
create policy treatment_variants_platform_admin_delete
  on public.treatment_variants for delete to authenticated
  using ((select private.is_platform_admin()));

-- Feature flags remain readable to all authenticated users; mutations remain platform-admin only.
drop policy if exists feature_flags_platform_admin_all on public.feature_flags;
create policy feature_flags_platform_admin_insert
  on public.feature_flags for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy feature_flags_platform_admin_update
  on public.feature_flags for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
create policy feature_flags_platform_admin_delete
  on public.feature_flags for delete to authenticated
  using ((select private.is_platform_admin()));

-- Service offers: preserve public eligible-offer reads, branch-member reads and writes,
-- and platform-admin access while using one authenticated policy per SQL action.
drop policy if exists branch_service_offers_platform_admin_all on public.branch_service_offers;
drop policy if exists offers_authenticated_select on public.branch_service_offers;
drop policy if exists offers_staff_insert on public.branch_service_offers;
drop policy if exists offers_staff_update on public.branch_service_offers;

create policy offers_authenticated_select
  on public.branch_service_offers for select to authenticated
  using (
    (
      status = 'active'
      and effective_from <= now()
      and (effective_to is null or effective_to > now())
      and exists (
        select 1
        from public.branches b
        join public.clinics c on c.id = b.clinic_id
        where b.id = branch_service_offers.branch_id
          and b.status = 'active'
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or (select private.has_branch_access(branch_service_offers.branch_id, null::text[]))
    or (select private.is_platform_admin())
  );
create policy offers_authenticated_insert
  on public.branch_service_offers for insert to authenticated
  with check (
    (select private.has_branch_access(branch_service_offers.branch_id, array['owner', 'manager', 'pricing_manager']))
    or (select private.is_platform_admin())
  );
create policy offers_authenticated_update
  on public.branch_service_offers for update to authenticated
  using (
    (select private.has_branch_access(branch_service_offers.branch_id, array['owner', 'manager']))
    or (select private.is_platform_admin())
  )
  with check (
    (select private.has_branch_access(branch_service_offers.branch_id, array['owner', 'manager']))
    or (select private.is_platform_admin())
  );
create policy offers_authenticated_delete
  on public.branch_service_offers for delete to authenticated
  using ((select private.is_platform_admin()));

-- Availability slots: preserve public published-slot reads, branch operations and admin access
-- through exactly one authenticated policy per action.
drop policy if exists availability_slots_platform_admin_all on public.availability_slots;
drop policy if exists availability_auth_select on public.availability_slots;
drop policy if exists availability_staff_insert on public.availability_slots;
drop policy if exists availability_staff_update on public.availability_slots;
drop policy if exists availability_staff_delete on public.availability_slots;

create policy availability_authenticated_select
  on public.availability_slots for select to authenticated
  using (
    (
      status = 'published'
      and start_at > now()
      and (expires_at is null or expires_at > now())
      and exists (
        select 1
        from public.branches b
        join public.clinics c on c.id = b.clinic_id
        where b.id = availability_slots.branch_id
          and b.status = 'active'
          and c.status = 'active'
          and not c.is_synthetic
      )
    )
    or (select private.has_branch_access(availability_slots.branch_id, null::text[]))
    or (select private.is_platform_admin())
  );
create policy availability_authenticated_insert
  on public.availability_slots for insert to authenticated
  with check (
    (select private.has_branch_access(availability_slots.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  );
create policy availability_authenticated_update
  on public.availability_slots for update to authenticated
  using (
    (select private.has_branch_access(availability_slots.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  )
  with check (
    (select private.has_branch_access(availability_slots.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  );
create policy availability_authenticated_delete
  on public.availability_slots for delete to authenticated
  using (
    (select private.has_branch_access(availability_slots.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  );

-- Patient-profile read access is the same logical union of own records and authorised booking staff.
drop policy if exists patient_profiles_select_own on public.patient_profiles;
drop policy if exists patient_profiles_select_operational_booking on public.patient_profiles;
create policy patient_profiles_authenticated_select
  on public.patient_profiles for select to authenticated
  using (
    account_id = (select auth.uid())
    or exists (
      select 1
      from public.bookings b
      where b.patient_profile_id = patient_profiles.id
        and private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])
    )
  );
