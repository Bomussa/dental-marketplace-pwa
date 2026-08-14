-- DEV ONLY. Synthetic clinics; never run in production.
insert into public.clinics(id,legal_name,display_name,status) values
('10000000-0000-4000-8000-000000000001','DEV Synthetic Alpha LLC','DEV Dental Alpha','pending'),
('10000000-0000-4000-8000-000000000002','DEV Synthetic Beta LLC','DEV Dental Beta','pending'),
('10000000-0000-4000-8000-000000000003','DEV Synthetic Gamma LLC','DEV Dental Gamma','pending')
on conflict (id) do nothing;

insert into public.verification_records(subject_type,subject_id,source,identifier,status,verified_at) values
('clinic','10000000-0000-4000-8000-000000000001','DEV_SYNTHETIC','DEV-C-001','verified',now()),
('clinic','10000000-0000-4000-8000-000000000002','DEV_SYNTHETIC','DEV-C-002','verified',now()),
('clinic','10000000-0000-4000-8000-000000000003','DEV_SYNTHETIC','DEV-C-003','verified',now());
update public.clinics set status='active' where id::text like '10000000-%';

insert into public.branches(id,clinic_id,name,area,address_line,location,status) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','DEV Alpha — Doha','Doha','Synthetic location','SRID=4326;POINT(51.5310 25.2854)'::extensions.geography,'pending'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','DEV Beta — Doha','Doha','Synthetic location','SRID=4326;POINT(51.5200 25.2950)'::extensions.geography,'pending'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','DEV Gamma — Doha','Doha','Synthetic location','SRID=4326;POINT(51.5450 25.2750)'::extensions.geography,'pending')
on conflict (id) do nothing;
insert into public.verification_records(subject_type,subject_id,source,identifier,status,verified_at) values
('branch','20000000-0000-4000-8000-000000000001','DEV_SYNTHETIC','DEV-B-001','verified',now()),
('branch','20000000-0000-4000-8000-000000000002','DEV_SYNTHETIC','DEV-B-002','verified',now()),
('branch','20000000-0000-4000-8000-000000000003','DEV_SYNTHETIC','DEV-B-003','verified',now());
update public.branches set status='active' where id::text like '20000000-%';

insert into public.branch_hours(branch_id,weekday,open_time,close_time,is_closed)
select b.id,d,'00:00'::time,'23:59'::time,false
from public.branches b cross join generate_series(0,6) d
where b.id::text like '20000000-%'
on conflict(branch_id,weekday) do update set open_time=excluded.open_time,close_time=excluded.close_time,is_closed=false;

with v as (
  select tv.id variant_id from public.treatment_variants tv
  join public.treatment_catalog tc on tc.id=tv.catalog_id
  where tc.code='root_canal' and tv.variant_key='molar'
)
insert into public.branch_service_offers(id,branch_id,variant_id,price_type,min_minor,max_minor,currency,duration_minutes,status,clinic_attested_at,last_verified_at) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',(select variant_id from v),'fixed',45000,45000,'QAR',60,'active',now(),now()),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',(select variant_id from v),'fixed',60000,60000,'QAR',60,'active',now(),now()),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',(select variant_id from v),'range',70000,90000,'QAR',60,'active',now(),now())
on conflict(id) do update set status='active',clinic_attested_at=now(),last_verified_at=now();

with v as (
  select tv.id variant_id from public.treatment_variants tv
  join public.treatment_catalog tc on tc.id=tv.catalog_id
  where tc.code='root_canal' and tv.variant_key='molar'
)
insert into public.availability_slots(id,branch_id,variant_id,start_at,end_at,status,freshness_at,expires_at) values
('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',(select variant_id from v),now()+interval '30 minutes',now()+interval '105 minutes','published',now(),now()+interval '150 minutes'),
('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',(select variant_id from v),now()+interval '60 minutes',now()+interval '135 minutes','published',now(),now()+interval '180 minutes'),
('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',(select variant_id from v),now()+interval '90 minutes',now()+interval '165 minutes','published',now(),now()+interval '210 minutes')
on conflict(id) do update set status='published',start_at=excluded.start_at,end_at=excluded.end_at,freshness_at=now(),expires_at=excluded.expires_at;
