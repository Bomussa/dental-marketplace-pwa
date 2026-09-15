-- PR #28 canonical waitlist migration.
-- Production already contains the equivalent schema under earlier canonical timestamps.
-- This migration is intentionally idempotent so fresh environments and production converge.

create table if not exists public.booking_waitlist (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  offer_id uuid not null references public.branch_service_offers(id) on delete cascade,
  variant_id uuid not null references public.treatment_variants(id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notified_at timestamptz,
  constraint booking_waitlist_status_check check (status in ('active','notified','cancelled','expired'))
);

create index if not exists booking_waitlist_offer_status_created_idx on public.booking_waitlist (offer_id, status, created_at, id);
create index if not exists booking_waitlist_account_status_idx on public.booking_waitlist (account_id, status, created_at desc);
create index if not exists booking_waitlist_variant_idx on public.booking_waitlist (variant_id, status, created_at, id);
create unique index if not exists booking_waitlist_active_patient_offer_uidx on public.booking_waitlist (patient_profile_id, offer_id) where status = 'active';

alter table public.booking_waitlist enable row level security;
drop policy if exists booking_waitlist_insert_own on public.booking_waitlist;
drop policy if exists booking_waitlist_select_own on public.booking_waitlist;
drop policy if exists booking_waitlist_update_own on public.booking_waitlist;
drop policy if exists booking_waitlist_delete_own on public.booking_waitlist;
create policy booking_waitlist_select_own on public.booking_waitlist for select using ((select auth.uid()) = account_id);

revoke all on table public.booking_waitlist from anon, authenticated;
grant select on table public.booking_waitlist to service_role;
grant insert, update, delete, select, references, trigger, truncate on table public.booking_waitlist to service_role;

alter table public.notification_outbox drop constraint if exists notification_outbox_event_type_check;
alter table public.notification_outbox add constraint notification_outbox_event_type_check check (
  event_type = any (array['booking_requested','booking_confirmed','booking_cancelled','booking_updated','attendance_recorded','price_updated','support_reply','waitlist_slot_opened','manual']::text[])
) not valid;
alter table public.notification_outbox validate constraint notification_outbox_event_type_check;

create or replace function public.join_booking_waitlist_server(p_actor_id uuid, p_offer_id uuid, p_patient_profile_id uuid)
returns table(waitlist_id uuid, waitlist_status text, queue_position bigint)
language plpgsql security definer set search_path to '' as $$
declare
  v_profile public.patient_profiles%rowtype;
  v_offer public.branch_service_offers%rowtype;
  v_entry public.booking_waitlist%rowtype;
  v_position bigint;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  select * into v_profile from public.patient_profiles where id=p_patient_profile_id and account_id=p_actor_id and archived_at is null for key share;
  if not found then raise exception 'patient profile is not available for this account' using errcode='42501'; end if;
  if v_profile.national_id is null or v_profile.nationality is null or v_profile.date_of_birth is null or v_profile.phone is null or v_profile.phone_verified_at is null then
    raise exception 'patient profile must be complete and phone verified' using errcode='22023';
  end if;
  select * into v_offer from public.branch_service_offers where id=p_offer_id and status='active' and public.is_price_scope_publishable(price_scope) and scope_confirmed_at is not null and clinic_attested_at is not null and effective_from<=now() and (effective_to is null or effective_to>now());
  if not found then raise exception 'offer is not eligible for the waitlist' using errcode='P0001'; end if;
  select * into v_entry from public.booking_waitlist where patient_profile_id=p_patient_profile_id and offer_id=p_offer_id and status='active' order by created_at asc,id asc limit 1;
  if found then
    select count(*)+1 into v_position from public.booking_waitlist w where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);
    return query select v_entry.id,v_entry.status,v_position;
    return;
  end if;
  insert into public.booking_waitlist(account_id,patient_profile_id,offer_id,variant_id) values(p_actor_id,p_patient_profile_id,v_offer.id,v_offer.variant_id) returning * into v_entry;
  select count(*)+1 into v_position from public.booking_waitlist w where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values(p_actor_id,'booking.waitlist_joined','booking_waitlist',v_entry.id::text,jsonb_build_object('offer_id',v_entry.offer_id,'variant_id',v_entry.variant_id,'patient_profile_id',v_entry.patient_profile_id));
  return query select v_entry.id,v_entry.status,v_position;
exception when unique_violation then
  select * into v_entry from public.booking_waitlist where patient_profile_id=p_patient_profile_id and offer_id=p_offer_id and status='active' order by created_at asc,id asc limit 1;
  if found then
    select count(*)+1 into v_position from public.booking_waitlist w where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);
    return query select v_entry.id,v_entry.status,v_position;
    return;
  end if;
  raise;
end;
$$;

create or replace function public.list_booking_waitlist_server(p_actor_id uuid)
returns table(waitlist_id uuid,status text,created_at timestamptz,notified_at timestamptz,treatment_name_ar text,treatment_name_en text)
language plpgsql security definer set search_path to '' as $$
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  return query select w.id,w.status,w.created_at,w.notified_at,tv.name_ar,tv.name_en from public.booking_waitlist w join public.treatment_variants tv on tv.id=w.variant_id where w.account_id=p_actor_id and w.status in ('active','notified') order by w.created_at desc limit 20;
end;
$$;

create or replace function public.withdraw_booking_waitlist_server(p_actor_id uuid,p_waitlist_id uuid)
returns text
language plpgsql security definer set search_path to '' as $$
declare v_status text; v_account_id uuid;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  select status,account_id into v_status,v_account_id from public.booking_waitlist where id=p_waitlist_id for update;
  if not found then raise exception 'waitlist entry not found' using errcode='P0002'; end if;
  if v_account_id<>p_actor_id then raise exception 'not authorized for this waitlist entry' using errcode='42501'; end if;
  if v_status='cancelled' then return 'cancelled'; end if;
  if v_status<>'active' then raise exception 'waitlist entry cannot be withdrawn from current state' using errcode='55000'; end if;
  update public.booking_waitlist set status='cancelled',updated_at=now() where id=p_waitlist_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values(p_actor_id,'booking.waitlist_withdrawn','booking_waitlist',p_waitlist_id::text,jsonb_build_object('previous_status','active'));
  return 'cancelled';
end;
$$;

create or replace function public.cancel_booking_server(p_actor_id uuid,p_booking_id uuid)
returns text
language plpgsql security definer set search_path to '' as $$
declare v_booking public.bookings%rowtype; v_previous_status text; v_slot_released boolean:=false; v_waitlist public.booking_waitlist%rowtype;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;
  if v_booking.booked_by_user_id<>p_actor_id then raise exception 'not authorized for this booking' using errcode='42501'; end if;
  if v_booking.status='patient_cancelled' then return v_booking.status; end if;
  if v_booking.status not in ('pending_clinic_confirmation','confirmed') then raise exception 'booking cannot be cancelled from current state' using errcode='55000'; end if;
  if v_booking.start_at<=now() then raise exception 'past bookings cannot be cancelled' using errcode='55000'; end if;
  v_previous_status:=v_booking.status;
  update public.bookings set status='patient_cancelled' where id=v_booking.id;
  update public.availability_slots set status='published' where id=v_booking.slot_id and status='held';
  get diagnostics v_slot_released=row_count;
  insert into public.booking_status_history(booking_id,from_status,to_status,actor_id,reason) values(v_booking.id,v_previous_status,'patient_cancelled',p_actor_id,'patient_cancelled');
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values(p_actor_id,'booking.cancelled','booking',v_booking.id::text,jsonb_build_object('previous_status',v_previous_status,'slot_id',v_booking.slot_id));
  insert into public.notification_outbox(recipient_user_id,event_type,event_id,channel,locale,payload,dedupe_key,status,created_by) values(v_booking.booked_by_user_id,'booking_cancelled',v_booking.id::text,'push','ar',jsonb_build_object('booking_id',v_booking.id,'booking_code',v_booking.booking_code,'start_at',v_booking.start_at,'clinic_id',v_booking.clinic_id),'booking_cancelled:'||v_booking.id::text||':'||v_booking.booked_by_user_id::text||':push:ar','pending',p_actor_id) on conflict(dedupe_key) do nothing;
  insert into public.notification_outbox(recipient_user_id,event_type,event_id,channel,locale,payload,dedupe_key,status,created_by) select membership.user_id,'booking_cancelled',v_booking.id::text,'push','ar',jsonb_build_object('booking_id',v_booking.id,'booking_code',v_booking.booking_code,'start_at',v_booking.start_at,'clinic_id',v_booking.clinic_id),'booking_cancelled:'||v_booking.id::text||':'||membership.user_id::text||':push:ar','pending',p_actor_id from public.clinic_memberships membership where membership.clinic_id=v_booking.clinic_id and membership.status='active' and membership.role in ('owner','manager','receptionist') on conflict(dedupe_key) do nothing;
  if v_slot_released then
    for v_waitlist in select * from public.booking_waitlist where offer_id=v_booking.offer_id and status='active' order by created_at asc,id asc for update skip locked loop
      insert into public.notification_outbox(recipient_user_id,event_type,event_id,channel,locale,payload,dedupe_key,status,created_by) values(v_waitlist.account_id,'waitlist_slot_opened',v_booking.id::text||':'||v_waitlist.id::text,'in_app','ar',jsonb_build_object('booking_id',v_booking.id,'waitlist_id',v_waitlist.id,'slot_id',v_booking.slot_id,'offer_id',v_booking.offer_id,'clinic_id',v_booking.clinic_id,'start_at',v_booking.start_at,'booking_code',v_booking.booking_code),'waitlist_slot_opened:'||v_booking.id::text||':'||v_waitlist.id::text||':in_app:ar','stored',p_actor_id) on conflict(dedupe_key) do nothing;
      update public.booking_waitlist set notified_at=now(),updated_at=now() where id=v_waitlist.id;
    end loop;
  end if;
  return 'patient_cancelled';
end;
$$;

revoke all on function public.join_booking_waitlist_server(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_booking_waitlist_server(uuid) from public,anon,authenticated;
revoke all on function public.withdraw_booking_waitlist_server(uuid,uuid) from public,anon,authenticated;
grant execute on function public.join_booking_waitlist_server(uuid,uuid,uuid) to service_role;
grant execute on function public.list_booking_waitlist_server(uuid) to service_role;
grant execute on function public.withdraw_booking_waitlist_server(uuid,uuid) to service_role;
revoke all on function public.cancel_booking_server(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_booking_server(uuid,uuid) to service_role;
