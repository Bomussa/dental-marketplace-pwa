create or replace function public.admin_customer_choice_analytics(p_days integer default 7)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
  v_since timestamptz;
  v_result jsonb;
begin
  if not coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false) then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  v_since := now() - make_interval(days => v_days);

  with filtered as (
    select
      e.event_name,
      e.session_id,
      e.treatment_id,
      e.variant_id,
      e.choice_value,
      e.created_at
    from public.customer_choice_events e
    where e.created_at >= v_since
  ),
  metrics as (
    select
      count(*)::bigint as total_events,
      count(distinct session_id)::bigint as unique_sessions,
      count(*) filter (where event_name = 'search_submitted')::bigint as searches,
      count(*) filter (where event_name = 'offer_booking_clicked')::bigint as booking_clicks,
      count(*) filter (where event_name = 'booking_login_required')::bigint as login_required,
      count(*) filter (where event_name = 'booking_succeeded')::bigint as booking_successes,
      count(*) filter (where event_name = 'booking_failed')::bigint as booking_failures,
      count(*) filter (where event_name = 'location_requested')::bigint as location_requested,
      count(*) filter (where event_name = 'location_acquired')::bigint as location_acquired,
      count(*) filter (where event_name = 'location_denied')::bigint as location_denied,
      count(*) filter (
        where event_name = 'search_submitted'
          and coalesce((choice_value ->> 'location_used')::boolean, false)
      )::bigint as searches_with_location,
      max(created_at) as last_event_at
    from filtered
  ),
  top_treatments as (
    select
      e.treatment_id as id,
      c.name_ar,
      c.name_en,
      count(*)::bigint as searches
    from filtered e
    join public.treatment_catalog c on c.id = e.treatment_id
    where e.event_name = 'search_submitted' and e.treatment_id is not null
    group by e.treatment_id, c.name_ar, c.name_en
    order by count(*) desc, c.name_ar
    limit 10
  ),
  top_variants as (
    select
      e.variant_id as id,
      v.name_ar,
      v.name_en,
      c.name_ar as treatment_name_ar,
      count(*)::bigint as searches
    from filtered e
    join public.treatment_variants v on v.id = e.variant_id
    join public.treatment_catalog c on c.id = v.catalog_id
    where e.event_name = 'search_submitted' and e.variant_id is not null
    group by e.variant_id, v.name_ar, v.name_en, c.name_ar
    order by count(*) desc, v.name_ar
    limit 10
  ),
  appointment_preferences as (
    select
      coalesce(nullif(e.choice_value ->> 'when', ''), 'unknown') as preference,
      count(*)::bigint as searches
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1
    order by count(*) desc, 1
  ),
  weekday_searches as (
    select
      extract(isodow from (e.created_at at time zone 'Asia/Qatar'))::integer as iso_day,
      count(*)::bigint as searches
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1
    order by 1
  ),
  hourly_searches as (
    select
      extract(hour from (e.created_at at time zone 'Asia/Qatar'))::integer as hour,
      count(*)::bigint as searches
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1
    order by 1
  ),
  recent_events as (
    select
      e.event_name,
      e.created_at,
      c.name_ar as treatment_name_ar,
      v.name_ar as variant_name_ar
    from filtered e
    left join public.treatment_catalog c on c.id = e.treatment_id
    left join public.treatment_variants v on v.id = e.variant_id
    order by e.created_at desc
    limit 20
  )
  select jsonb_build_object(
    'window_days', v_days,
    'since', v_since,
    'generated_at', now(),
    'timezone', 'Asia/Qatar',
    'metrics', coalesce((select to_jsonb(m) from metrics m), '{}'::jsonb),
    'top_treatments', coalesce((select jsonb_agg(to_jsonb(t) order by t.searches desc, t.name_ar) from top_treatments t), '[]'::jsonb),
    'top_variants', coalesce((select jsonb_agg(to_jsonb(v) order by v.searches desc, v.name_ar) from top_variants v), '[]'::jsonb),
    'appointment_preferences', coalesce((select jsonb_agg(to_jsonb(a) order by a.searches desc, a.preference) from appointment_preferences a), '[]'::jsonb),
    'weekday_searches', coalesce((select jsonb_agg(to_jsonb(w) order by w.iso_day) from weekday_searches w), '[]'::jsonb),
    'hourly_searches', coalesce((select jsonb_agg(to_jsonb(h) order by h.hour) from hourly_searches h), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent_events r), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_customer_choice_analytics(integer) from public;
revoke all on function public.admin_customer_choice_analytics(integer) from anon;
grant execute on function public.admin_customer_choice_analytics(integer) to authenticated;
