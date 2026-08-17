-- Platform administrators govern the complete public treatment surface without granting those mutation rights to clinics or visitors.

grant select, insert, update, delete on table public.treatment_catalog to authenticated;
grant select, insert, update, delete on table public.treatment_variants to authenticated;
grant select, insert, update, delete on table public.feature_flags to authenticated;
grant select, insert, update, delete on table public.branch_service_offers to authenticated;
grant select, insert, update, delete on table public.availability_slots to authenticated;

create policy treatment_catalog_platform_admin_all
  on public.treatment_catalog
  for all
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

create policy treatment_variants_platform_admin_all
  on public.treatment_variants
  for all
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

create policy feature_flags_platform_admin_all
  on public.feature_flags
  for all
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

create policy branch_service_offers_platform_admin_all
  on public.branch_service_offers
  for all
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

create policy availability_slots_platform_admin_all
  on public.availability_slots
  for all
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
