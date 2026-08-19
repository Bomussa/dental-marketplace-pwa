-- Read-only/rollback-friendly acceptance probes for a seeded DEV database.
-- Run with Supabase SQL after applying migrations + seed.dev.sql.

-- A. Search must sort exact Root Canal — Molar offers by price.
set local role anon;
select clinic_name,min_minor,max_minor,distance_km,open_now,earliest_slot_id
from public.search_dental_offers(
  (select tv.id from public.treatment_variants tv join public.treatment_catalog tc on tc.id=tv.catalog_id where tc.code='root_canal' and tv.variant_key='molar'),
  25.2854,51.5310,10
);
reset role;

-- B. A 1 km radius around Alpha should return one seeded clinic.
set local role anon;
select count(*) as expected_one
from public.search_dental_offers(
  (select tv.id from public.treatment_variants tv join public.treatment_catalog tc on tc.id=tv.catalog_id where tc.code='root_canal' and tv.variant_key='molar'),
  25.2854,51.5310,1
);
reset role;

-- C. Security posture: server-only audit data is not a client privilege.
select has_table_privilege('anon','public.audit_events','select') as anon_can_read_audit,
       has_table_privilege('authenticated','public.audit_events','select') as authenticated_can_read_audit;


-- D. Synthetic DEV fixtures must never be returned by public search.
set local role anon;
select count(*) as synthetic_rows_exposed
from public.search_dental_offers(
  (select tv.id from public.treatment_variants tv join public.treatment_catalog tc on tc.id=tv.catalog_id where tc.code='root_canal' and tv.variant_key='molar'),
  null,
  null,
  10
)
where clinic_id in (
  select vr.subject_id::uuid
  from public.verification_records vr
  where vr.subject_type = 'clinic'
    and vr.source = 'DEV_SYNTHETIC'
);
reset role;

-- E. Direct public table reads must also hide synthetic fixtures.
set local role anon;
select count(*) as synthetic_offers_directly_exposed
from public.branch_service_offers o
join public.branches b on b.id = o.branch_id
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;

select count(*) as synthetic_slots_directly_exposed
from public.availability_slots s
join public.branches b on b.id = s.branch_id
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;
reset role;

-- F. Every direct public surface tied to a synthetic clinic must stay empty.
set local role anon;
select count(*) as synthetic_clinics_directly_exposed
from public.clinics c
where c.is_synthetic;

select count(*) as synthetic_branches_directly_exposed
from public.branches b
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;

select count(*) as synthetic_practitioners_directly_exposed
from public.practitioners p
join public.clinics c on c.id = p.clinic_id
where c.is_synthetic;

select count(*) as synthetic_branch_hours_directly_exposed
from public.branch_hours h
join public.branches b on b.id = h.branch_id
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;

select count(*) as synthetic_branch_exceptions_directly_exposed
from public.branch_hour_exceptions e
join public.branches b on b.id = e.branch_id
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;

select count(*) as synthetic_instant_slots_directly_exposed
from public.instant_slots i
join public.branch_service_offers o on o.id = i.offer_id
join public.branches b on b.id = o.branch_id
join public.clinics c on c.id = b.clinic_id
where c.is_synthetic;

select count(*) as synthetic_reviews_directly_exposed
from public.reviews r
join public.clinics c on c.id = r.clinic_id
where c.is_synthetic;
reset role;
