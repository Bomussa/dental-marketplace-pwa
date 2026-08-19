-- Return published branch coordinates to the public comparison surface for directions links.
-- Patient coordinates remain an optional request parameter and are never persisted by this function.

revoke all on function public.search_dental_offers(uuid, double precision, double precision, double precision) from public;
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
  branch_latitude double precision,
  branch_longitude double precision,
  variant_id uuid,
  price_type text,
  min_minor integer,
  max_minor integer,
  currency character(3),
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
    case when b.location is null then null else extensions.st_y(b.location::extensions.geometry) end as branch_latitude,
    case when b.location is null then null else extensions.st_x(b.location::extensions.geometry) end as branch_longitude,
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

grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to anon, authenticated;
