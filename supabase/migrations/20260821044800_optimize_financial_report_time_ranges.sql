-- Keep financial report ranges indexable and explicitly aligned to the Qatar reporting day.

create index if not exists bookings_clinic_start_at_idx
  on public.bookings (clinic_id, start_at);

create or replace function public.financial_report_summary_server(
  p_actor_id uuid,
  p_clinic_id uuid,
  p_start date,
  p_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  if not private.is_platform_admin_for_actor(p_actor_id)
    and not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner', 'manager']) then
    raise exception 'not authorized for this report' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'invalid report interval' using errcode = '22023';
  end if;

  v_start_at := p_start::timestamp at time zone 'Asia/Qatar';
  v_end_at := (p_end + 1)::timestamp at time zone 'Asia/Qatar';

  select jsonb_build_object(
    'clinic_id', p_clinic_id,
    'period_start', p_start,
    'period_end', p_end,
    'attended_bookings', (
      select count(*)
      from public.bookings b
      where b.clinic_id = p_clinic_id
        and b.start_at >= v_start_at
        and b.start_at < v_end_at
        and (
          select e.event_type
          from public.booking_attendance_events e
          where e.booking_id = b.id
          order by e.sequence_no desc
          limit 1
        ) = 'checked_in'
    ),
    'posted_debit_minor', (
      select coalesce(sum(l.debit_minor), 0)
      from public.accounting_journals j
      join public.accounting_journal_lines l on l.journal_id = j.id
      where j.clinic_id = p_clinic_id
        and j.status = 'posted'
        and j.occurred_at >= v_start_at
        and j.occurred_at < v_end_at
    ),
    'posted_credit_minor', (
      select coalesce(sum(l.credit_minor), 0)
      from public.accounting_journals j
      join public.accounting_journal_lines l on l.journal_id = j.id
      where j.clinic_id = p_clinic_id
        and j.status = 'posted'
        and j.occurred_at >= v_start_at
        and j.occurred_at < v_end_at
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.financial_report_summary(
  p_clinic_id uuid,
  p_start date,
  p_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  if not private.is_platform_admin()
    and not private.has_clinic_role(p_clinic_id, null, array['owner', 'manager']) then
    raise exception 'not authorized for this report' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'invalid report interval' using errcode = '22023';
  end if;

  v_start_at := p_start::timestamp at time zone 'Asia/Qatar';
  v_end_at := (p_end + 1)::timestamp at time zone 'Asia/Qatar';

  select jsonb_build_object(
    'clinic_id', p_clinic_id,
    'period_start', p_start,
    'period_end', p_end,
    'attended_bookings', (
      select count(*)
      from public.bookings b
      where b.clinic_id = p_clinic_id
        and b.start_at >= v_start_at
        and b.start_at < v_end_at
        and (
          select e.event_type
          from public.booking_attendance_events e
          where e.booking_id = b.id
          order by e.sequence_no desc
          limit 1
        ) = 'checked_in'
    ),
    'posted_debit_minor', (
      select coalesce(sum(l.debit_minor), 0)
      from public.accounting_journals j
      join public.accounting_journal_lines l on l.journal_id = j.id
      where j.clinic_id = p_clinic_id
        and j.status = 'posted'
        and j.occurred_at >= v_start_at
        and j.occurred_at < v_end_at
    ),
    'posted_credit_minor', (
      select coalesce(sum(l.credit_minor), 0)
      from public.accounting_journals j
      join public.accounting_journal_lines l on l.journal_id = j.id
      where j.clinic_id = p_clinic_id
        and j.status = 'posted'
        and j.occurred_at >= v_start_at
        and j.occurred_at < v_end_at
    )
  ) into result;
  return result;
end;
$$;
