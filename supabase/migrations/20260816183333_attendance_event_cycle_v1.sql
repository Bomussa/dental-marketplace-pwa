drop index if exists public.booking_one_active_checkin_idx;

create or replace function private.enforce_booking_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_staff boolean := false;
  v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if new.status=old.status then return new; end if;

  if not v_privileged then
    v_staff := private.has_branch_access(old.branch_id,array['owner','manager','receptionist']::text[]);
    if v_staff then
      if new.status not in ('pending_clinic_confirmation','confirmed','checked_in','completed','clinic_cancelled','no_show','expired','failed') then
        raise exception 'clinic actor cannot set booking status %',new.status;
      end if;
    elsif v_actor=old.patient_id then
      if new.status <> 'patient_cancelled' then raise exception 'patient may only cancel own booking'; end if;
    else
      raise exception 'actor is not allowed to change booking status';
    end if;
  end if;

  if old.status='pending_hold' and new.status in ('pending_clinic_confirmation','confirmed','expired','failed','patient_cancelled') then return new;
  elsif old.status='pending_clinic_confirmation' and new.status in ('confirmed','clinic_cancelled','patient_cancelled','expired','failed') then return new;
  elsif old.status='confirmed' and new.status in ('checked_in','completed','patient_cancelled','clinic_cancelled','no_show','failed') then return new;
  elsif old.status='checked_in' and new.status in ('confirmed','completed','clinic_cancelled','failed') then return new;
  else raise exception 'invalid booking status transition: % -> %',old.status,new.status;
  end if;
end;
$$;

create or replace function public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  if p_reason is not null and char_length(trim(p_reason)) not between 3 and 500 then raise exception 'invalid check-in reason' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,target_booking.clinic_id,target_booking.branch_id,array['owner','manager','receptionist']) then raise exception 'not authorized for this booking' using errcode='42501'; end if;
  if target_booking.status not in ('confirmed','checked_in') then raise exception 'booking cannot be checked in from current state' using errcode='55000'; end if;

  select e.event_type,e.id into latest_event_type,event_id
  from public.booking_attendance_events e
  where e.booking_id=p_booking_id
  order by e.occurred_at desc,e.created_at desc,e.id desc
  limit 1;

  if target_booking.status='checked_in' and latest_event_type='checked_in' then
    return event_id;
  end if;

  if target_booking.status='confirmed' then update public.bookings set status='checked_in' where id=p_booking_id; end if;

  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id)
  values(p_booking_id,'checked_in',p_reason,p_actor_id,'clinic_ui','checkin:'||gen_random_uuid()::text)
  returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.record_booking_check_in(p_booking_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_reason is not null and char_length(trim(p_reason)) not between 3 and 500 then raise exception 'invalid check-in reason' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role(target_booking.clinic_id,target_booking.branch_id,array['owner','manager','receptionist']) then raise exception 'not authorized for this booking' using errcode='42501'; end if;
  if target_booking.status not in ('confirmed','checked_in') then raise exception 'booking cannot be checked in from current state' using errcode='55000'; end if;

  select e.event_type,e.id into latest_event_type,event_id
  from public.booking_attendance_events e
  where e.booking_id=p_booking_id
  order by e.occurred_at desc,e.created_at desc,e.id desc
  limit 1;
  if target_booking.status='checked_in' and latest_event_type='checked_in' then return event_id; end if;

  if target_booking.status='confirmed' then update public.bookings set status='checked_in' where id=p_booking_id; end if;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id)
  values(p_booking_id,'checked_in',p_reason,auth.uid(),'clinic_ui','checkin:'||gen_random_uuid()::text)
  returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a reversal reason is required' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,target_booking.clinic_id,target_booking.branch_id,array['owner','manager']) and not private.is_platform_admin_for_actor(p_actor_id) then raise exception 'manager or platform admin required' using errcode='42501'; end if;
  if target_booking.status <> 'checked_in' then raise exception 'only a checked-in booking can be reversed' using errcode='55000'; end if;

  select e.event_type into latest_event_type
  from public.booking_attendance_events e
  where e.booking_id=p_booking_id
  order by e.occurred_at desc,e.created_at desc,e.id desc
  limit 1;
  if latest_event_type is distinct from 'checked_in' then raise exception 'booking has no active check-in to reverse' using errcode='55000'; end if;

  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id)
  values(p_booking_id,'attendance_reversed',p_reason,p_actor_id,case when private.is_platform_admin_for_actor(p_actor_id) then 'admin_ui' else 'clinic_ui' end,'reversal:'||gen_random_uuid()::text)
  returning id into event_id;
  update public.bookings set status='confirmed' where id=p_booking_id;
  return event_id;
end;
$$;

create or replace function public.reverse_booking_attendance(p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a reversal reason is required' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role(target_booking.clinic_id,target_booking.branch_id,array['owner','manager']) and not private.is_platform_admin() then raise exception 'manager or platform admin required' using errcode='42501'; end if;
  if target_booking.status <> 'checked_in' then raise exception 'only a checked-in booking can be reversed' using errcode='55000'; end if;

  select e.event_type into latest_event_type
  from public.booking_attendance_events e
  where e.booking_id=p_booking_id
  order by e.occurred_at desc,e.created_at desc,e.id desc
  limit 1;
  if latest_event_type is distinct from 'checked_in' then raise exception 'booking has no active check-in to reverse' using errcode='55000'; end if;

  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id)
  values(p_booking_id,'attendance_reversed',p_reason,auth.uid(),case when private.is_platform_admin() then 'admin_ui' else 'clinic_ui' end,'reversal:'||gen_random_uuid()::text)
  returning id into event_id;
  update public.bookings set status='confirmed' where id=p_booking_id;
  return event_id;
end;
$$;

create or replace function public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_allowed boolean := false;
  v_transition_allowed boolean := false;
  v_status text;
  v_latest_attendance text;
begin
  if p_actor_id is null or p_booking_id is null then raise exception 'actor and booking are required' using errcode='22023'; end if;
  if p_status not in ('confirmed','completed','clinic_cancelled','no_show','failed') then raise exception 'unsupported clinic booking status' using errcode='22023'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  v_allowed := coalesce(private.is_platform_admin_for_actor(p_actor_id),false) or private.has_clinic_role_for_actor(p_actor_id,v_booking.clinic_id,v_booking.branch_id,array['owner','manager','receptionist']::text[]);
  if not v_allowed then raise exception 'actor cannot manage this booking' using errcode='42501'; end if;
  if p_status=v_booking.status then return v_booking.status; end if;

  v_transition_allowed :=
    (p_status='confirmed' and v_booking.status in ('pending_hold','pending_clinic_confirmation'))
    or (p_status='completed' and v_booking.status='checked_in')
    or (p_status='clinic_cancelled' and v_booking.status in ('pending_clinic_confirmation','confirmed','checked_in'))
    or (p_status='no_show' and v_booking.status='confirmed')
    or (p_status='failed' and v_booking.status in ('pending_hold','pending_clinic_confirmation','confirmed','checked_in'));
  if not v_transition_allowed then raise exception 'invalid clinic booking transition: % -> %',v_booking.status,p_status using errcode='55000'; end if;
  if p_status='no_show' and now()<v_booking.start_at then raise exception 'booking cannot be marked no-show before appointment time' using errcode='55000'; end if;

  if p_status='completed' then
    select e.event_type into v_latest_attendance from public.booking_attendance_events e where e.booking_id=p_booking_id order by e.occurred_at desc,e.created_at desc,e.id desc limit 1;
    if v_latest_attendance is distinct from 'checked_in' then raise exception 'booking requires an active check-in before completion' using errcode='55000'; end if;
  end if;

  update public.bookings set status=p_status where id=p_booking_id returning status into v_status;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values(p_actor_id,'booking.status_changed','booking',p_booking_id::text,jsonb_build_object('from',v_booking.status,'to',v_status,'branch_id',v_booking.branch_id));
  return v_status;
end;
$$;

create or replace function public.financial_report_summary_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not private.is_platform_admin_for_actor(p_actor_id) and not private.has_clinic_role_for_actor(p_actor_id,p_clinic_id,null,array['owner','manager']) then raise exception 'not authorized for this report' using errcode='42501'; end if;
  if p_end<p_start then raise exception 'invalid report interval' using errcode='22023'; end if;
  select jsonb_build_object(
    'clinic_id',p_clinic_id,
    'period_start',p_start,
    'period_end',p_end,
    'attended_bookings',(
      select count(*) from public.bookings b
      where b.clinic_id=p_clinic_id
        and (select e.event_type from public.booking_attendance_events e where e.booking_id=b.id order by e.occurred_at desc,e.created_at desc,e.id desc limit 1)='checked_in'
        and b.start_at::date between p_start and p_end
    ),
    'posted_debit_minor',(select coalesce(sum(l.debit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end),
    'posted_credit_minor',(select coalesce(sum(l.credit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end)
  ) into result;
  return result;
end;
$$;

create or replace function public.financial_report_summary(p_clinic_id uuid, p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not private.is_platform_admin() and not private.has_clinic_role(p_clinic_id,null,array['owner','manager']) then raise exception 'not authorized for this report' using errcode='42501'; end if;
  if p_end<p_start then raise exception 'invalid report interval' using errcode='22023'; end if;
  select jsonb_build_object(
    'clinic_id',p_clinic_id,
    'period_start',p_start,
    'period_end',p_end,
    'attended_bookings',(
      select count(*) from public.bookings b
      where b.clinic_id=p_clinic_id
        and (select e.event_type from public.booking_attendance_events e where e.booking_id=b.id order by e.occurred_at desc,e.created_at desc,e.id desc limit 1)='checked_in'
        and b.start_at::date between p_start and p_end
    ),
    'posted_debit_minor',(select coalesce(sum(l.debit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end),
    'posted_credit_minor',(select coalesce(sum(l.credit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end)
  ) into result;
  return result;
end;
$$;
