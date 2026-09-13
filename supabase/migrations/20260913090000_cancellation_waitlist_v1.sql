-- Cancellation waitlist foundation. No automatic rebooking.
-- The notification/re-fill trigger remains a separate unverified follow-up because the existing
-- booking cancellation state machine must be extended without bypassing its current audit/RPC path.

create table if not exists public.booking_waitlist (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete cascade,
  offer_id uuid not null references public.branch_service_offers(id) on delete cascade,
  variant_id uuid not null references public.treatment_variants(id) on delete restrict,
  status text not null default 'active' check (status in ('active','notified','cancelled','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notified_at timestamptz null
);

create unique index if not exists booking_waitlist_active_patient_offer_uidx
  on public.booking_waitlist(patient_profile_id, offer_id)
  where status = 'active';

create index if not exists booking_waitlist_offer_status_created_idx
  on public.booking_waitlist(offer_id, status, created_at, id);

create index if not exists booking_waitlist_account_status_idx
  on public.booking_waitlist(account_id, status, created_at desc);

alter table public.booking_waitlist enable row level security;

drop policy if exists booking_waitlist_select_own on public.booking_waitlist;
create policy booking_waitlist_select_own
  on public.booking_waitlist
  for select
  to authenticated
  using ((select auth.uid()) = account_id);

drop policy if exists booking_waitlist_insert_own on public.booking_waitlist;
create policy booking_waitlist_insert_own
  on public.booking_waitlist
  for insert
  to authenticated
  with check ((select auth.uid()) = account_id);

create or replace function public.join_booking_waitlist_server(
  p_actor_id uuid,
  p_offer_id uuid,
  p_patient_profile_id uuid
)
returns table(waitlist_id uuid, waitlist_status text, queue_position bigint)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := p_actor_id;
  v_profile public.patient_profiles%rowtype;
  v_offer public.branch_service_offers%rowtype;
  v_entry public.booking_waitlist%rowtype;
  v_position bigint;
begin
  if v_user is null then raise exception 'verified actor is required' using errcode='28000'; end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  select * into v_profile
  from public.patient_profiles
  where id=p_patient_profile_id and account_id=v_user and archived_at is null
  for key share;
  if not found then raise exception 'patient profile is not available for this account' using errcode='42501'; end if;

  if v_profile.national_id is null or v_profile.nationality is null or v_profile.date_of_birth is null or v_profile.phone is null or v_profile.phone_verified_at is null then
    raise exception 'patient profile must be complete and phone verified' using errcode='22023';
  end if;

  select * into v_offer
  from public.branch_service_offers
  where id=p_offer_id and status='active'
    and public.is_price_scope_publishable(price_scope)
    and scope_confirmed_at is not null and clinic_attested_at is not null
    and effective_from<=now() and (effective_to is null or effective_to>now());
  if not found then raise exception 'offer is not eligible for the waitlist' using errcode='P0001'; end if;

  select * into v_entry
  from public.booking_waitlist
  where patient_profile_id=p_patient_profile_id and offer_id=p_offer_id and status='active'
  order by created_at asc limit 1;
  if found then
    select count(*)+1 into v_position from public.booking_waitlist w
    where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);
    return query select v_entry.id,v_entry.status,v_position;
  end if;

  insert into public.booking_waitlist(account_id,patient_profile_id,offer_id,variant_id)
  values(v_user,p_patient_profile_id,v_offer.id,v_offer.variant_id)
  returning * into v_entry;

  select count(*)+1 into v_position from public.booking_waitlist w
  where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);

  insert into public.audit_events(actor_id,action,target_type,target_id,metadata)
  values(v_user,'booking.waitlist_joined','booking_waitlist',v_entry.id::text,jsonb_build_object('offer_id',v_entry.offer_id,'variant_id',v_entry.variant_id,'patient_profile_id',v_entry.patient_profile_id));

  return query select v_entry.id,v_entry.status,v_position;
exception when unique_violation then
  select * into v_entry from public.booking_waitlist
  where patient_profile_id=p_patient_profile_id and offer_id=p_offer_id and status='active'
  order by created_at asc limit 1;
  if found then
    select count(*)+1 into v_position from public.booking_waitlist w
    where w.offer_id=v_entry.offer_id and w.status='active' and (w.created_at,w.id)<(v_entry.created_at,v_entry.id);
    return query select v_entry.id,v_entry.status,v_position;
  end if;
  raise;
end;
$$;

revoke all on function public.join_booking_waitlist_server(uuid,uuid,uuid) from public;
grant execute on function public.join_booking_waitlist_server(uuid,uuid,uuid) to authenticated;

-- Rollback:
-- revoke all on function public.join_booking_waitlist_server(uuid,uuid,uuid) from authenticated;
-- drop function if exists public.join_booking_waitlist_server(uuid,uuid,uuid);
-- drop policy if exists booking_waitlist_insert_own on public.booking_waitlist;
-- drop policy if exists booking_waitlist_select_own on public.booking_waitlist;
-- drop index if exists booking_waitlist_account_status_idx;
-- drop index if exists booking_waitlist_offer_status_created_idx;
-- drop index if exists booking_waitlist_active_patient_offer_uidx;
-- drop table if exists public.booking_waitlist;
