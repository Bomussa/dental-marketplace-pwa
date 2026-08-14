drop policy if exists "platform admins can read all treatment catalog" on public.treatment_catalog;
drop policy if exists "treatment_catalog_public" on public.treatment_catalog;

create policy "treatment_catalog_anon_active"
on public.treatment_catalog
for select
to anon
using (active);

create policy "treatment_catalog_authenticated"
on public.treatment_catalog
for select
to authenticated
using (
  active
  or coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false)
);

drop policy if exists "platform admins can read all treatment variants" on public.treatment_variants;
drop policy if exists "treatment_variants_public" on public.treatment_variants;

create policy "treatment_variants_anon_active"
on public.treatment_variants
for select
to anon
using (active);

create policy "treatment_variants_authenticated"
on public.treatment_variants
for select
to authenticated
using (
  active
  or coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false)
);
