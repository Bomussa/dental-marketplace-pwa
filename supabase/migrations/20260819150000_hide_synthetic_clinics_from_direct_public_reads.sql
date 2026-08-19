-- Synthetic clinic fixtures must be invisible not only in comparison RPCs,
-- but also through direct anon/authenticated PostgREST reads of offers and slots.
-- Authorized branch staff and platform admins retain operational access through
-- their existing access predicates and policies.

drop policy if exists offers_public_select on public.branch_service_offers;
create policy offers_public_select
  on public.branch_service_offers
  for select
  to anon
  using (
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
  );

drop policy if exists offers_authenticated_select on public.branch_service_offers;
create policy offers_authenticated_select
  on public.branch_service_offers
  for select
  to authenticated
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
  );

drop policy if exists availability_anon_select on public.availability_slots;
create policy availability_anon_select
  on public.availability_slots
  for select
  to anon
  using (
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
  );

drop policy if exists availability_auth_select on public.availability_slots;
create policy availability_auth_select
  on public.availability_slots
  for select
  to authenticated
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
  );
