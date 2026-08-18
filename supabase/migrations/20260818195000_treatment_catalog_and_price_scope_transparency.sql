-- Catalogue breadth and price-scope transparency.
-- No price is fabricated here. A clinic must attest its own scope before an offer can be public.

alter table public.branch_service_offers
  add column if not exists price_scope jsonb not null default jsonb_build_object(
    'registration', 'not_confirmed',
    'examination', 'not_confirmed',
    'xray', 'not_confirmed',
    'diagnostics', 'not_confirmed',
    'anesthesia', 'not_confirmed',
    'laboratory', 'not_confirmed',
    'medications', 'not_confirmed'
  ),
  add column if not exists scope_confirmed_at timestamptz;

create or replace function public.is_valid_price_scope(p_scope jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_scope) = 'object'
    and p_scope ?& array['registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications']
    and not exists (
      select 1
      from jsonb_each_text(p_scope) as item(key, value)
      where item.key in ('registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications')
        and item.value not in ('included', 'excluded', 'assessment_required', 'not_applicable', 'not_confirmed')
    );
$$;

alter table public.branch_service_offers
  drop constraint if exists branch_service_offers_price_scope_shape_check;

alter table public.branch_service_offers
  add constraint branch_service_offers_price_scope_shape_check
  check (public.is_valid_price_scope(price_scope));

create or replace function public.is_price_scope_publishable(p_scope jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_scope) = 'object'
    and p_scope ?& array['registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications']
    and not exists (
      select 1
      from jsonb_each_text(p_scope) as item(key, value)
      where item.key in ('registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications')
        and item.value not in ('included', 'excluded', 'assessment_required', 'not_applicable')
    );
$$;

create or replace function public.enforce_public_offer_price_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and not public.is_price_scope_publishable(new.price_scope) then
    raise exception using errcode = '23514', message = 'PRICE_SCOPE_CONFIRMATION_REQUIRED';
  end if;

  if public.is_price_scope_publishable(new.price_scope) then
    new.scope_confirmed_at := coalesce(new.scope_confirmed_at, now());
  else
    new.scope_confirmed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists branch_service_offers_public_scope_guard on public.branch_service_offers;
create trigger branch_service_offers_public_scope_guard
before insert or update of status, price_scope on public.branch_service_offers
for each row execute function public.enforce_public_offer_price_scope();

-- The following additions complete the platform's general-dentistry and common-specialist-marketplace baseline.
-- They are catalog entries only: no clinic, price, appointment, or patient data is generated.
insert into public.treatment_catalog (code, category, name_ar, name_en, comparison_version, active)
values
  ('periodontal_assessment', 'periodontics', 'تقييم أمراض اللثة', 'Periodontal Assessment', 1, true),
  ('periodontal_root_planing', 'periodontics', 'تسوية وتنظيف جذور الأسنان', 'Scaling and Root Planing', 1, true),
  ('periodontal_surgery', 'periodontics', 'جراحة اللثة', 'Periodontal Surgery', 1, true),
  ('gum_graft', 'periodontics', 'ترقيع اللثة', 'Gum Graft', 1, true),
  ('dental_bridge', 'prosthodontics', 'جسر أسنان', 'Dental Bridge', 1, true),
  ('inlay_onlay', 'prosthodontics', 'ترميم Inlay أو Onlay', 'Inlay or Onlay Restoration', 1, true),
  ('denture_repair', 'prosthodontics', 'إصلاح أو إعادة تبطين طقم الأسنان', 'Denture Repair or Reline', 1, true),
  ('implant_crown', 'implantology', 'تاج على زرعة', 'Implant Crown', 1, true),
  ('bone_graft', 'implantology', 'ترقيع عظم للأسنان', 'Dental Bone Graft', 1, true),
  ('sinus_lift', 'implantology', 'رفع الجيب الأنفي للزراعة', 'Sinus Lift for Implant', 1, true),
  ('apicectomy', 'oral_surgery', 'استئصال قمة الجذر', 'Apicectomy', 1, true),
  ('impacted_tooth_exposure', 'oral_surgery', 'كشف سن مطمور', 'Impacted Tooth Exposure', 1, true),
  ('dental_trauma', 'emergency', 'علاج إصابة أو كسر الأسنان', 'Dental Trauma Treatment', 1, true),
  ('cephalometric_xray', 'diagnostics', 'أشعة سيفالومترية', 'Cephalometric X-Ray', 1, true),
  ('full_mouth_xray', 'diagnostics', 'سلسلة أشعة كاملة للفم', 'Full-Mouth X-Ray Series', 1, true),
  ('orthodontic_retainer', 'orthodontics', 'مثبت تقويم الأسنان', 'Orthodontic Retainer', 1, true),
  ('space_maintainer', 'pediatric', 'حافظ مسافة للأطفال', 'Pediatric Space Maintainer', 1, true),
  ('pediatric_pulpectomy', 'pediatric', 'استئصال لب سن للأطفال', 'Pediatric Pulpectomy', 1, true),
  ('pediatric_extraction', 'pediatric', 'خلع سن للأطفال', 'Pediatric Tooth Extraction', 1, true),
  ('occlusal_splint', 'oral_medicine', 'جهاز صرير الأسنان أو مفصل الفك', 'Occlusal Splint for Bruxism or TMJ', 1, true),
  ('oral_medicine_consultation', 'oral_medicine', 'استشارة طب الفم', 'Oral Medicine Consultation', 1, true),
  ('special_care_dentistry', 'special_care', 'استشارة طب أسنان الرعاية الخاصة', 'Special Care Dentistry Consultation', 1, true),
  ('dental_laser_treatment', 'specialist', 'علاج أسنان بالليزر', 'Laser Dental Treatment', 1, true)
on conflict (code) do update
set category = excluded.category,
    name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    comparison_version = greatest(public.treatment_catalog.comparison_version, excluded.comparison_version),
    active = true,
    updated_at = now();

with source(code, variant_key, name_ar, name_en, attributes) as (
  values
    ('periodontal_assessment', 'comprehensive', 'تقييم لثوي شامل', 'Comprehensive Periodontal Assessment', '{"scope":"periodontics"}'::jsonb),
    ('periodontal_root_planing', 'per_quadrant', 'تسوية جذور وتنظيف عميق — ربع فم', 'Scaling and Root Planing — Per Quadrant', '{"unit":"quadrant"}'::jsonb),
    ('periodontal_root_planing', 'full_mouth', 'تسوية جذور وتنظيف عميق — فم كامل', 'Scaling and Root Planing — Full Mouth', '{"unit":"full_mouth"}'::jsonb),
    ('periodontal_surgery', 'flap', 'جراحة رفرف لثوي', 'Periodontal Flap Surgery', '{"scope":"periodontics"}'::jsonb),
    ('gum_graft', 'per_site', 'ترقيع لثة — موضع واحد', 'Gum Graft — Per Site', '{"unit":"site"}'::jsonb),
    ('dental_bridge', 'three_unit_pfm', 'جسر ثلاثي الوحدات — معدن وخزف', 'Three-Unit PFM Bridge', '{"units":3,"material":"pfm"}'::jsonb),
    ('dental_bridge', 'three_unit_zirconia', 'جسر ثلاثي الوحدات — زيركون', 'Three-Unit Zirconia Bridge', '{"units":3,"material":"zirconia"}'::jsonb),
    ('inlay_onlay', 'ceramic_inlay', 'Inlay خزفي', 'Ceramic Inlay', '{"material":"ceramic"}'::jsonb),
    ('inlay_onlay', 'ceramic_onlay', 'Onlay خزفي', 'Ceramic Onlay', '{"material":"ceramic"}'::jsonb),
    ('denture_repair', 'repair', 'إصلاح طقم أسنان', 'Denture Repair', '{"scope":"repair"}'::jsonb),
    ('denture_repair', 'reline', 'إعادة تبطين طقم أسنان', 'Denture Reline', '{"scope":"reline"}'::jsonb),
    ('implant_crown', 'zirconia', 'تاج زيركون على زرعة', 'Zirconia Implant Crown', '{"material":"zirconia"}'::jsonb),
    ('implant_crown', 'emax', 'تاج E.max على زرعة', 'E.max Implant Crown', '{"material":"emax"}'::jsonb),
    ('bone_graft', 'per_site', 'ترقيع عظم — موضع واحد', 'Dental Bone Graft — Per Site', '{"unit":"site"}'::jsonb),
    ('sinus_lift', 'internal', 'رفع جيب أنفي داخلي', 'Internal Sinus Lift', '{"approach":"internal"}'::jsonb),
    ('sinus_lift', 'lateral', 'رفع جيب أنفي جانبي', 'Lateral Sinus Lift', '{"approach":"lateral"}'::jsonb),
    ('apicectomy', 'single_root', 'استئصال قمة الجذر — جذر واحد', 'Apicectomy — Single Root', '{"roots":1}'::jsonb),
    ('apicectomy', 'multi_root', 'استئصال قمة الجذر — متعدد الجذور', 'Apicectomy — Multiple Roots', '{"roots":"multiple"}'::jsonb),
    ('impacted_tooth_exposure', 'standard', 'كشف سن مطمور', 'Impacted Tooth Exposure', '{"scope":"oral_surgery"}'::jsonb),
    ('dental_trauma', 'urgent_assessment', 'تقييم إصابة أسنان عاجل', 'Urgent Dental Trauma Assessment', '{"urgency":"urgent"}'::jsonb),
    ('dental_trauma', 'splint', 'تثبيت سن مصاب', 'Dental Trauma Splint', '{"scope":"trauma"}'::jsonb),
    ('cephalometric_xray', 'standard', 'أشعة سيفالومترية', 'Cephalometric X-Ray', '{"modality":"cephalometric"}'::jsonb),
    ('full_mouth_xray', 'standard', 'سلسلة أشعة كاملة للفم', 'Full-Mouth X-Ray Series', '{"modality":"full_mouth"}'::jsonb),
    ('orthodontic_retainer', 'removable', 'مثبت تقويم متحرك', 'Removable Orthodontic Retainer', '{"type":"removable"}'::jsonb),
    ('orthodontic_retainer', 'bonded', 'مثبت تقويم ثابت', 'Bonded Orthodontic Retainer', '{"type":"bonded"}'::jsonb),
    ('space_maintainer', 'band_loop', 'حافظ مسافة Band and Loop', 'Band and Loop Space Maintainer', '{"type":"band_loop"}'::jsonb),
    ('space_maintainer', 'lingual_arch', 'حافظ مسافة Lingual Arch', 'Lingual Arch Space Maintainer', '{"type":"lingual_arch"}'::jsonb),
    ('pediatric_pulpectomy', 'primary_tooth', 'استئصال لب سن لبني', 'Primary Tooth Pulpectomy', '{"tooth":"primary"}'::jsonb),
    ('pediatric_extraction', 'primary_tooth', 'خلع سن لبني', 'Primary Tooth Extraction', '{"tooth":"primary"}'::jsonb),
    ('occlusal_splint', 'hard_acrylic', 'جهاز صرير أسنان أكريليك صلب', 'Hard Acrylic Occlusal Splint', '{"material":"acrylic"}'::jsonb),
    ('oral_medicine_consultation', 'standard', 'استشارة طب الفم', 'Oral Medicine Consultation', '{"scope":"specialist"}'::jsonb),
    ('special_care_dentistry', 'assessment', 'تقييم طب أسنان الرعاية الخاصة', 'Special Care Dentistry Assessment', '{"scope":"specialist"}'::jsonb),
    ('dental_laser_treatment', 'soft_tissue', 'علاج أنسجة رخوة بالليزر', 'Laser Soft-Tissue Treatment', '{"scope":"specialist"}'::jsonb)
)
insert into public.treatment_variants (catalog_id, variant_key, name_ar, name_en, attributes, active)
select tc.id, source.variant_key, source.name_ar, source.name_en, source.attributes, true
from source
join public.treatment_catalog tc on tc.code = source.code
where not exists (
  select 1
  from public.treatment_variants current
  where current.catalog_id = tc.id and current.variant_key = source.variant_key
);

drop function if exists public.search_dental_offers(uuid, double precision, double precision, double precision);

create function public.search_dental_offers(
  p_variant_id uuid,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 10
)
returns table(
  offer_id uuid,
  clinic_id uuid,
  clinic_name text,
  branch_id uuid,
  branch_name text,
  area text,
  variant_id uuid,
  price_type text,
  min_minor integer,
  max_minor integer,
  currency character,
  price_scope jsonb,
  included_items jsonb,
  excluded_items jsonb,
  materials jsonb,
  visit_count integer,
  follow_up_terms text,
  scope_confirmed_at timestamptz,
  duration_minutes integer,
  clinic_attested_at timestamptz,
  last_verified_at timestamptz,
  distance_km double precision,
  open_now boolean,
  earliest_slot_id uuid,
  earliest_slot_at timestamptz,
  rating_avg numeric,
  review_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    o.id,
    c.id,
    c.display_name,
    b.id,
    b.name,
    b.area,
    o.variant_id,
    o.price_type,
    o.min_minor,
    o.max_minor,
    o.currency,
    o.price_scope,
    o.included_items,
    o.excluded_items,
    o.materials,
    o.visit_count,
    o.follow_up_terms,
    o.scope_confirmed_at,
    o.duration_minutes,
    o.clinic_attested_at,
    o.last_verified_at,
    case
      when p_lat is null or p_lng is null or b.location is null then null
      else extensions.st_distance(
        b.location,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      ) / 1000.0
    end as distance_km,
    coalesce(
      case
        when ex.id is not null then (
          not ex.is_closed
          and (now() at time zone b.timezone)::time >= ex.open_time
          and (now() at time zone b.timezone)::time < ex.close_time
        )
        else (
          not bh.is_closed
          and (now() at time zone b.timezone)::time >= bh.open_time
          and (now() at time zone b.timezone)::time < bh.close_time
        )
      end,
      false
    ) as open_now,
    es.id,
    es.start_at,
    rv.rating_avg,
    rv.review_count
  from public.branch_service_offers o
  join public.branches b on b.id = o.branch_id
  join public.clinics c on c.id = b.clinic_id
  join public.treatment_variants tv on tv.id = o.variant_id and tv.active
  join public.treatment_catalog tc on tc.id = tv.catalog_id and tc.active
  left join public.branch_hour_exceptions ex
    on ex.branch_id = b.id
    and ex.local_date = (now() at time zone b.timezone)::date
  left join public.branch_hours bh
    on bh.branch_id = b.id
    and bh.weekday = extract(dow from (now() at time zone b.timezone))::smallint
  left join lateral (
    select s.id, s.start_at
    from public.availability_slots s
    where s.branch_id = b.id
      and s.variant_id = o.variant_id
      and s.status = 'published'
      and s.start_at > now()
      and (s.expires_at is null or s.expires_at > now())
      and extract(epoch from (s.end_at - s.start_at)) / 60.0 >= o.duration_minutes
    order by s.start_at
    limit 1
  ) es on true
  left join lateral (
    select round(avg(r.rating)::numeric, 2) as rating_avg, count(*)::bigint as review_count
    from public.reviews r
    where r.clinic_id = c.id
      and r.status = 'published'
  ) rv on true
  where o.variant_id = p_variant_id
    and o.status = 'active'
    and public.is_price_scope_publishable(o.price_scope)
    and o.scope_confirmed_at is not null
    and o.clinic_attested_at is not null
    and o.effective_from <= now()
    and (o.effective_to is null or o.effective_to > now())
    and b.status = 'active'
    and c.status = 'active'
    and not c.is_synthetic
    and (
      p_lat is null
      or p_lng is null
      or b.location is null
      or p_radius_km is null
      or extensions.st_dwithin(
        b.location,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
        greatest(p_radius_km, 0) * 1000.0
      )
    )
  order by
    case when o.price_type = 'consultation_required' then 1 else 0 end,
    o.min_minor asc nulls last,
    distance_km asc nulls last,
    o.clinic_attested_at desc;
$$;

revoke all on function public.search_dental_offers(uuid, double precision, double precision, double precision) from public;
grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to anon, authenticated;
