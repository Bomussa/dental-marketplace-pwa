-- Printable operational activity reports, aggregated exclusively in Asia/Qatar.
-- The server-only entry points below never expose patient-identifying data.

create index if not exists idx_bookings_clinic_patient_created_at
  on public.bookings (clinic_id, patient_profile_id, created_at);

create or replace function private.activity_report_json(
  p_clinic_id uuid,
  p_start date,
  p_end date,
  p_granularity text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_timezone constant text := 'Asia/Qatar';
  v_from timestamptz := p_start::timestamp at time zone v_timezone;
  v_to timestamptz := (p_end + 1)::timestamp at time zone v_timezone;
  v_bucket_start timestamp;
  v_bucket_end timestamp;
  v_step interval;
  v_result jsonb;
begin
  if p_granularity not in ('hourly', 'daily', 'weekly', 'monthly') then
    raise exception 'INVALID_GRANULARITY' using errcode = '22023';
  end if;

  v_bucket_start := case p_granularity
    when 'hourly' then p_start::timestamp
    when 'daily' then p_start::timestamp
    when 'weekly' then date_trunc('week', p_start::timestamp)
    when 'monthly' then date_trunc('month', p_start::timestamp)
  end;
  v_bucket_end := case p_granularity
    when 'hourly' then p_end::timestamp + interval '23 hours'
    when 'daily' then p_end::timestamp
    when 'weekly' then date_trunc('week', p_end::timestamp)
    when 'monthly' then date_trunc('month', p_end::timestamp)
  end;
  v_step := case p_granularity
    when 'hourly' then interval '1 hour'
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'monthly' then interval '1 month'
  end;

  with
    buckets as (
      select bucket_start
      from generate_series(v_bucket_start, v_bucket_end, v_step) as bucket_start
    ),
    scoped_bookings as (
      select b.patient_profile_id, b.created_at, b.status
      from public.bookings b
      where (p_clinic_id is null or b.clinic_id = p_clinic_id)
        and b.created_at >= v_from
        and b.created_at < v_to
    ),
    booking_bucket_counts as (
      select
        date_trunc(p_granularity, b.created_at at time zone v_timezone) as bucket_start,
        count(*)::integer as new_bookings,
        count(*) filter (where b.status = 'confirmed')::integer as confirmed_bookings,
        count(*) filter (where b.status in ('checked_in', 'completed'))::integer as attended_bookings,
        count(*) filter (where b.status = 'completed')::integer as completed_bookings,
        count(*) filter (where b.status in ('patient_cancelled', 'clinic_cancelled', 'failed', 'no_show'))::integer as closed_without_completion
      from scoped_bookings b
      group by 1
    ),
    scoped_patient_events as (
      select p.created_at
      from public.patient_profiles p
      where p_clinic_id is null
        and p.archived_at is null
        and p.created_at >= v_from
        and p.created_at < v_to
      union all
      select first_booking.first_booked_at
      from (
        select b.patient_profile_id, min(b.created_at) as first_booked_at
        from public.bookings b
        where p_clinic_id is not null
          and b.clinic_id = p_clinic_id
        group by b.patient_profile_id
      ) first_booking
      where first_booking.first_booked_at >= v_from
        and first_booking.first_booked_at < v_to
    ),
    patient_bucket_counts as (
      select
        date_trunc(p_granularity, p.created_at at time zone v_timezone) as bucket_start,
        count(*)::integer as new_patients
      from scoped_patient_events p
      group by 1
    ),
    scoped_clinic_events as (
      select c.created_at
      from public.clinics c
      where p_clinic_id is null
        and c.created_at >= v_from
        and c.created_at < v_to
    ),
    clinic_bucket_counts as (
      select
        date_trunc(p_granularity, c.created_at at time zone v_timezone) as bucket_start,
        count(*)::integer as new_clinics
      from scoped_clinic_events c
      group by 1
    ),
    report_buckets as (
      select jsonb_build_object(
        'bucket_start', to_char(bucket.bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
        'bucket_end', to_char(bucket.bucket_start + v_step, 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
        'new_clinics', coalesce(clinic_counts.new_clinics, 0),
        'new_patients', coalesce(patient_counts.new_patients, 0),
        'new_bookings', coalesce(booking_counts.new_bookings, 0),
        'confirmed_bookings', coalesce(booking_counts.confirmed_bookings, 0),
        'attended_bookings', coalesce(booking_counts.attended_bookings, 0),
        'completed_bookings', coalesce(booking_counts.completed_bookings, 0),
        'closed_without_completion', coalesce(booking_counts.closed_without_completion, 0)
      ) as bucket
      from buckets bucket
      left join clinic_bucket_counts clinic_counts using (bucket_start)
      left join patient_bucket_counts patient_counts using (bucket_start)
      left join booking_bucket_counts booking_counts using (bucket_start)
      order by bucket.bucket_start
    ),
    clinic_patient_totals as (
      select count(*)::integer as total_patients
      from (
        select b.patient_profile_id
        from public.bookings b
        where p_clinic_id is not null and b.clinic_id = p_clinic_id
        group by b.patient_profile_id
      ) clinic_patient
    )
  select jsonb_build_object(
    'scope', case when p_clinic_id is null then 'platform' else 'clinic' end,
    'clinic_id', p_clinic_id,
    'period_start', p_start,
    'period_end', p_end,
    'granularity', p_granularity,
    'timezone', v_timezone,
    'generated_at', to_char(now() at time zone v_timezone, 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
    'total_clinics', case when p_clinic_id is null then (select count(*)::integer from public.clinics) else 1 end,
    'active_clinics', case when p_clinic_id is null then (select count(*)::integer from public.clinics where status = 'active') else (select count(*)::integer from public.clinics where id = p_clinic_id and status = 'active') end,
    'total_patients', case when p_clinic_id is null then (select count(*)::integer from public.patient_profiles where archived_at is null) else (select total_patients from clinic_patient_totals) end,
    'total_bookings', (select count(*)::integer from public.bookings b where p_clinic_id is null or b.clinic_id = p_clinic_id),
    'new_clinics_in_period', case when p_clinic_id is null then (select count(*)::integer from scoped_clinic_events) else 0 end,
    'new_patients_in_period', (select count(*)::integer from scoped_patient_events),
    'new_bookings_in_period', (select count(*)::integer from scoped_bookings),
    'buckets', coalesce((select jsonb_agg(bucket) from report_buckets), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.platform_activity_report_server(
  p_actor_id uuid,
  p_start date,
  p_end date,
  p_granularity text default 'daily'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not private.is_platform_admin_for_actor(p_actor_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'INVALID_REPORT_INTERVAL' using errcode = '22023';
  end if;
  return private.activity_report_json(null, p_start, p_end, p_granularity);
end;
$$;

create or replace function public.clinic_activity_report_server(
  p_actor_id uuid,
  p_clinic_id uuid,
  p_start date,
  p_end date,
  p_granularity text default 'daily'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null
    or not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner', 'manager']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'INVALID_REPORT_INTERVAL' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002';
  end if;
  return private.activity_report_json(p_clinic_id, p_start, p_end, p_granularity);
end;
$$;

revoke all on function public.platform_activity_report_server(uuid, date, date, text) from public, anon, authenticated;
grant execute on function public.platform_activity_report_server(uuid, date, date, text) to service_role;
revoke all on function public.clinic_activity_report_server(uuid, uuid, date, date, text) from public, anon, authenticated;
grant execute on function public.clinic_activity_report_server(uuid, uuid, date, date, text) to service_role;

comment on function public.platform_activity_report_server(uuid, date, date, text) is
  'Server-only platform activity report. All event buckets use Asia/Qatar and contain no patient PII.';
comment on function public.clinic_activity_report_server(uuid, uuid, date, date, text) is
  'Server-only clinic activity report for an owner or manager. All event buckets use Asia/Qatar and contain no patient PII.';
