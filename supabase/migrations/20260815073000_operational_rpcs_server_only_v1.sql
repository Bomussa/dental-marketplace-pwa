-- Harden operational SECURITY DEFINER RPCs: direct REST execution is prohibited.
-- Next.js server actions authenticate the user and pass the verified actor id using a service-role client.

revoke all on function public.request_offer_revision(uuid,text,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.review_offer_revision(uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.record_booking_check_in(uuid,text) from public, anon, authenticated;
revoke all on function public.reverse_booking_attendance(uuid,text) from public, anon, authenticated;
revoke all on function public.create_settlement_period(uuid,date,date,text,text) from public, anon, authenticated;
revoke all on function public.financial_report_summary(uuid,date,date) from public, anon, authenticated;

create or replace function private.is_platform_admin_for_actor(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
  from auth.users u where u.id = p_actor_id
$$;

create or replace function private.has_clinic_role_for_actor(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = p_actor_id
      and cm.status = 'active'
      and cm.role = any(p_roles)
      and ((p_branch_id is null and cm.branch_id is null) or (p_branch_id is not null and (cm.branch_id is null or cm.branch_id = p_branch_id)))
  )
$$;

revoke all on function private.is_platform_admin_for_actor(uuid) from public;
revoke all on function private.has_clinic_role_for_actor(uuid,uuid,uuid,text[]) from public;

create or replace function public.request_offer_revision_server(
  p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare current_offer public.branch_service_offers%rowtype; next_revision integer; revision_id uuid; proposed jsonb;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode = '28000'; end if;
  if p_price_type not in ('fixed','from','range','package','consultation_required') or p_duration_minutes not between 5 and 480 then raise exception 'invalid offer values' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a revision reason is required' using errcode = '22023'; end if;
  select o.* into current_offer from public.branch_service_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,(select b.clinic_id from public.branches b where b.id=current_offer.branch_id),current_offer.branch_id,array['owner','manager','pricing_manager']) then raise exception 'not authorized for this offer' using errcode='42501'; end if;
  if p_price_type = 'consultation_required' and (p_min_minor is not null or p_max_minor is not null) then raise exception 'consultation-required price cannot carry amounts' using errcode='22023'; end if;
  if p_price_type = 'fixed' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'fixed price requires one non-negative amount' using errcode='22023'; end if;
  if p_price_type = 'range' and (p_min_minor is null or p_max_minor is null or p_min_minor < 0 or p_max_minor < p_min_minor) then raise exception 'invalid price range' using errcode='22023'; end if;
  if p_price_type in ('from','package') and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'price type requires one non-negative minimum' using errcode='22023'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.offer_revisions where offer_id=p_offer_id;
  proposed:=jsonb_build_object('price_type',p_price_type,'min_minor',p_min_minor,'max_minor',p_max_minor,'duration_minutes',p_duration_minutes);
  insert into public.offer_revisions(offer_id,revision_no,previous_snapshot,proposed_snapshot,reason,status,requested_by)
  values(p_offer_id,next_revision,to_jsonb(current_offer),proposed,p_reason,'submitted',p_actor_id) returning id into revision_id;
  return revision_id;
end;
$$;

create or replace function public.review_offer_revision_server(p_actor_id uuid, p_revision_id uuid, p_approve boolean, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare revision public.offer_revisions%rowtype; target_offer uuid;
begin
  if not private.is_platform_admin_for_actor(p_actor_id) then raise exception 'platform admin required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_reason,''))) > 500 then raise exception 'review reason too long' using errcode='22023'; end if;
  if not p_approve and char_length(trim(coalesce(p_reason,''))) < 3 then raise exception 'rejection reason is required' using errcode='22023'; end if;
  select * into revision from public.offer_revisions where id=p_revision_id for update;
  if not found then raise exception 'offer revision not found' using errcode='P0002'; end if;
  if revision.status <> 'submitted' then raise exception 'only submitted revisions can be reviewed' using errcode='55000'; end if;
  if p_approve then
    update public.branch_service_offers set price_type=revision.proposed_snapshot->>'price_type',min_minor=nullif(revision.proposed_snapshot->>'min_minor','')::integer,max_minor=nullif(revision.proposed_snapshot->>'max_minor','')::integer,duration_minutes=(revision.proposed_snapshot->>'duration_minutes')::integer,status='active',clinic_attested_at=now(),updated_at=now() where id=revision.offer_id;
    update public.offer_revisions set status='approved',reviewed_by=p_actor_id,reviewed_at=now(),updated_at=now() where id=p_revision_id;
  else
    update public.offer_revisions set status='rejected',reviewed_by=p_actor_id,reviewed_at=now(),updated_at=now(),proposed_snapshot=proposed_snapshot||jsonb_build_object('review_reason',p_reason) where id=p_revision_id;
  end if;
  target_offer:=revision.offer_id; return target_offer;
end;
$$;

create or replace function public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target_booking public.bookings%rowtype; event_id uuid;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  if p_reason is not null and char_length(trim(p_reason)) not between 3 and 500 then raise exception 'invalid check-in reason' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,target_booking.clinic_id,target_booking.branch_id,array['owner','manager','receptionist']) then raise exception 'not authorized for this booking' using errcode='42501'; end if;
  if target_booking.status not in ('confirmed','checked_in') then raise exception 'booking cannot be checked in from current state' using errcode='55000'; end if;
  if target_booking.status='confirmed' then update public.bookings set status='checked_in' where id=p_booking_id; end if;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id) values(p_booking_id,'checked_in',p_reason,p_actor_id,'clinic_ui','checkin') on conflict do nothing returning id into event_id;
  if event_id is null then select id into event_id from public.booking_attendance_events where booking_id=p_booking_id and event_type='checked_in' limit 1; end if;
  return event_id;
end;
$$;

create or replace function public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target_booking public.bookings%rowtype; event_id uuid;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a reversal reason is required' using errcode='22023'; end if;
  select * into target_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,target_booking.clinic_id,target_booking.branch_id,array['owner','manager']) and not private.is_platform_admin_for_actor(p_actor_id) then raise exception 'manager or platform admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.booking_attendance_events where booking_id=p_booking_id and event_type='checked_in') then raise exception 'booking has no check-in to reverse' using errcode='55000'; end if;
  if exists(select 1 from public.booking_attendance_events where booking_id=p_booking_id and event_type='attendance_reversed') then raise exception 'attendance is already reversed' using errcode='55000'; end if;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id) values(p_booking_id,'attendance_reversed',p_reason,p_actor_id,case when private.is_platform_admin_for_actor(p_actor_id) then 'admin_ui' else 'clinic_ui' end,'reversal') returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.create_settlement_period_server(p_actor_id uuid, p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare period_id uuid;
begin
  if not private.is_platform_admin_for_actor(p_actor_id) then raise exception 'platform admin required' using errcode='42501'; end if;
  if p_period_kind not in ('weekly','monthly','annual','manual') or p_period_end < p_period_start then raise exception 'invalid settlement period' using errcode='22023'; end if;
  if exists(select 1 from public.settlement_periods sp where sp.clinic_id=p_clinic_id and sp.status<>'void' and daterange(sp.period_start,sp.period_end,'[]') && daterange(p_period_start,p_period_end,'[]')) then raise exception 'settlement period overlaps an existing non-void period' using errcode='23P01'; end if;
  insert into public.settlement_periods(clinic_id,period_start,period_end,period_kind,notes,created_by) values(p_clinic_id,p_period_start,p_period_end,p_period_kind,p_notes,p_actor_id) returning id into period_id;
  return period_id;
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
  if p_end < p_start then raise exception 'invalid report interval' using errcode='22023'; end if;
  select jsonb_build_object('clinic_id',p_clinic_id,'period_start',p_start,'period_end',p_end,'attended_bookings',(select count(*) from public.bookings b where b.clinic_id=p_clinic_id and exists(select 1 from public.booking_attendance_events ae where ae.booking_id=b.id and ae.event_type='checked_in') and not exists(select 1 from public.booking_attendance_events ar where ar.booking_id=b.id and ar.event_type='attendance_reversed') and b.start_at::date between p_start and p_end),'posted_debit_minor',(select coalesce(sum(l.debit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end),'posted_credit_minor',(select coalesce(sum(l.credit_minor),0) from public.accounting_journals j join public.accounting_journal_lines l on l.journal_id=j.id where j.clinic_id=p_clinic_id and j.status='posted' and j.occurred_at::date between p_start and p_end)) into result;
  return result;
end;
$$;

revoke all on function public.request_offer_revision_server(uuid,uuid,text,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.review_offer_revision_server(uuid,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.record_booking_check_in_server(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.reverse_booking_attendance_server(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.create_settlement_period_server(uuid,uuid,date,date,text,text) from public, anon, authenticated;
revoke all on function public.financial_report_summary_server(uuid,uuid,date,date) from public, anon, authenticated;
grant execute on function public.request_offer_revision_server(uuid,uuid,text,integer,integer,integer,text) to service_role;
grant execute on function public.review_offer_revision_server(uuid,uuid,boolean,text) to service_role;
grant execute on function public.record_booking_check_in_server(uuid,uuid,text) to service_role;
grant execute on function public.reverse_booking_attendance_server(uuid,uuid,text) to service_role;
grant execute on function public.create_settlement_period_server(uuid,uuid,date,date,text,text) to service_role;
grant execute on function public.financial_report_summary_server(uuid,uuid,date,date) to service_role;
