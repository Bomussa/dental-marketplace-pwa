-- Family patient profiles and privacy-preserving device installations.
-- This migration preserves legacy patient_id as the booking account during rollout,
-- while making patient_profile_id the person receiving the appointment.

create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null,
  relationship text not null default 'self',
  date_of_birth date null,
  gender text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint patient_profiles_display_name_check check (char_length(btrim(display_name)) between 1 and 120),
  constraint patient_profiles_relationship_check check (relationship in ('self', 'child', 'spouse', 'parent', 'other')),
  constraint patient_profiles_gender_check check (gender is null or gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  constraint patient_profiles_date_of_birth_check check (date_of_birth is null or date_of_birth >= date '1900-01-01')
);

create unique index if not exists patient_profiles_one_active_self_per_account
  on public.patient_profiles(account_id)
  where relationship = 'self' and archived_at is null;

create index if not exists patient_profiles_account_active_idx
  on public.patient_profiles(account_id, created_at desc)
  where archived_at is null;

create table if not exists public.device_installations (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null unique,
  account_id uuid null references auth.users(id) on delete set null,
  device_label text null,
  platform text null,
  browser text null,
  device_class text null,
  app_version text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_installations_label_check check (device_label is null or char_length(btrim(device_label)) between 1 and 80),
  constraint device_installations_platform_check check (platform is null or char_length(btrim(platform)) <= 80),
  constraint device_installations_browser_check check (browser is null or char_length(btrim(browser)) <= 120),
  constraint device_installations_class_check check (device_class is null or device_class in ('mobile', 'tablet', 'desktop', 'unknown')),
  constraint device_installations_version_check check (app_version is null or char_length(btrim(app_version)) <= 80)
);

create index if not exists device_installations_account_last_seen_idx
  on public.device_installations(account_id, last_seen_at desc)
  where account_id is not null;

alter table public.patient_profiles enable row level security;
alter table public.device_installations enable row level security;

revoke all on table public.patient_profiles from anon;
revoke all on table public.device_installations from anon, authenticated;
grant select on table public.patient_profiles to authenticated;

drop policy if exists patient_profiles_select_own on public.patient_profiles;
create policy patient_profiles_select_own
  on public.patient_profiles
  for select
  to authenticated
  using (account_id = (select auth.uid()));

-- Device installation writes are server-side only. No client role receives a policy or grant.

create or replace function private.touch_patient_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.touch_device_installation_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_patient_profile_updated_at() from public;
revoke all on function private.touch_device_installation_updated_at() from public;

drop trigger if exists patient_profiles_touch_updated_at on public.patient_profiles;
create trigger patient_profiles_touch_updated_at
before update on public.patient_profiles
for each row execute function private.touch_patient_profile_updated_at();

drop trigger if exists device_installations_touch_updated_at on public.device_installations;
create trigger device_installations_touch_updated_at
before update on public.device_installations
for each row execute function private.touch_device_installation_updated_at();

-- Backfill one minimal self profile for every historical booking account.
insert into public.patient_profiles(account_id, display_name, relationship)
select distinct b.patient_id, 'أنا', 'self'
from public.bookings b
where not exists (
  select 1
  from public.patient_profiles pp
  where pp.account_id = b.patient_id
    and pp.relationship = 'self'
    and pp.archived_at is null
);

alter table public.bookings
  add column if not exists booked_by_user_id uuid,
  add column if not exists patient_profile_id uuid;

update public.bookings
set booked_by_user_id = patient_id
where booked_by_user_id is null;

update public.bookings b
set patient_profile_id = pp.id
from public.patient_profiles pp
where pp.account_id = b.patient_id
  and pp.relationship = 'self'
  and pp.archived_at is null
  and b.patient_profile_id is null;

alter table public.bookings
  alter column booked_by_user_id set not null,
  alter column patient_profile_id set not null;

alter table public.bookings
  add constraint bookings_booked_by_user_id_fkey
    foreign key (booked_by_user_id) references auth.users(id) on delete restrict,
  add constraint bookings_patient_profile_id_fkey
    foreign key (patient_profile_id) references public.patient_profiles(id) on delete restrict;

create index if not exists bookings_booked_by_user_created_idx
  on public.bookings(booked_by_user_id, created_at desc);

create unique index if not exists bookings_booked_by_idempotency_key_key
  on public.bookings(booked_by_user_id, idempotency_key);

-- Preserve the original public three-argument RPC for in-flight clients by resolving
-- the authenticated account's self profile. New clients must pass a profile explicitly.
create or replace function private.book_slot_internal(
  p_slot_id uuid,
  p_offer_id uuid,
  p_idempotency_key text,
  p_patient_profile_id uuid
)
returns table(booking_id uuid, booking_code text, booking_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.patient_profiles%rowtype;
  v_slot public.availability_slots%rowtype;
  v_offer record;
  v_existing public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_code text;
  v_snapshot jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_patient_profile_id is null then raise exception 'patient profile is required' using errcode='22023'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'invalid idempotency key' using errcode='22023'; end if;

  select * into v_profile
  from public.patient_profiles
  where id = p_patient_profile_id
    and account_id = v_user
    and archived_at is null
  for key share;
  if not found then raise exception 'patient profile is not available for this account' using errcode='42501'; end if;

  select * into v_existing from public.bookings
  where booked_by_user_id = v_user and idempotency_key = p_idempotency_key
  limit 1;
  if found then
    return query select v_existing.id, v_existing.booking_code, v_existing.status;
    return;
  end if;

  select * into v_slot from public.availability_slots where id=p_slot_id for update;
  if not found then raise exception 'slot not found' using errcode='P0002'; end if;
  if v_slot.status <> 'published' or v_slot.start_at <= now() or (v_slot.expires_at is not null and v_slot.expires_at <= now()) then
    raise exception 'slot is not bookable' using errcode='P0001';
  end if;

  select o.*, b.clinic_id, b.status branch_status, c.status clinic_status,
         tc.code treatment_code, tc.name_ar treatment_name_ar, tc.name_en treatment_name_en,
         tv.variant_key, tv.name_ar variant_name_ar, tv.name_en variant_name_en
  into v_offer
  from public.branch_service_offers o
  join public.branches b on b.id=o.branch_id
  join public.clinics c on c.id=b.clinic_id
  join public.treatment_variants tv on tv.id=o.variant_id and tv.active
  join public.treatment_catalog tc on tc.id=tv.catalog_id and tc.active
  where o.id=p_offer_id and o.branch_id=v_slot.branch_id and o.variant_id=v_slot.variant_id
    and o.status='active' and o.effective_from <= now() and (o.effective_to is null or o.effective_to > now())
  limit 1;

  if not found or v_offer.branch_status <> 'active' or v_offer.clinic_status <> 'active' then
    raise exception 'offer or slot treatment is not eligible' using errcode='P0001';
  end if;
  if extract(epoch from (v_slot.end_at-v_slot.start_at))/60.0 < v_offer.duration_minutes then
    raise exception 'slot is shorter than clinical duration' using errcode='P0001';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_snapshot := jsonb_build_object(
    'offer_id',v_offer.id,'treatment_code',v_offer.treatment_code,
    'treatment_name_ar',v_offer.treatment_name_ar,'treatment_name_en',v_offer.treatment_name_en,
    'variant_key',v_offer.variant_key,'variant_name_ar',v_offer.variant_name_ar,'variant_name_en',v_offer.variant_name_en,
    'price_type',v_offer.price_type,'min_minor',v_offer.min_minor,'max_minor',v_offer.max_minor,'currency',v_offer.currency,
    'duration_minutes',v_offer.duration_minutes,
    'consultation_included',v_offer.consultation_included,'xray_included',v_offer.xray_included,
    'anesthesia_included',v_offer.anesthesia_included,'lab_included',v_offer.lab_included,
    'included_items',v_offer.included_items,'excluded_items',v_offer.excluded_items,
    'effective_from',v_offer.effective_from,'clinic_attested_at',v_offer.clinic_attested_at,
    'last_verified_at',v_offer.last_verified_at,'captured_at',now()
  );

  begin
    insert into public.bookings(
      patient_id, booked_by_user_id, patient_profile_id, clinic_id, branch_id,
      practitioner_id, resource_id, slot_id, offer_id, start_at, end_at,
      status, offer_snapshot, idempotency_key, booking_code
    ) values(
      v_user, v_user, v_profile.id, v_offer.clinic_id, v_slot.branch_id,
      v_slot.practitioner_id, v_slot.resource_id, v_slot.id, v_offer.id,
      v_slot.start_at, v_slot.end_at, 'pending_clinic_confirmation',
      v_snapshot, p_idempotency_key, v_code
    ) returning * into v_booking;
  exception
    when unique_violation then
      select * into v_existing from public.bookings
      where booked_by_user_id = v_user and idempotency_key = p_idempotency_key
      limit 1;
      if found then
        return query select v_existing.id, v_existing.booking_code, v_existing.status;
        return;
      end if;
      raise exception 'slot already claimed' using errcode='P0001';
    when exclusion_violation then
      raise exception 'practitioner or resource already booked' using errcode='P0001';
  end;

  update public.availability_slots set status='held' where id=v_slot.id;
  insert into public.booking_status_history(booking_id,from_status,to_status,actor_id,reason)
    values(v_booking.id,null,v_booking.status,v_user,'booking_created');
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata)
    values(v_user,'booking.created','booking',v_booking.id::text,jsonb_build_object(
      'slot_id',v_slot.id,'offer_id',v_offer.id,'variant_id',v_slot.variant_id,
      'patient_profile_id',v_profile.id
    ));
  return query select v_booking.id,v_booking.booking_code,v_booking.status;
end;
$$;

create or replace function public.book_slot(
  p_slot_id uuid,
  p_offer_id uuid,
  p_idempotency_key text
)
returns table(booking_id uuid, booking_code text, booking_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare v_self_profile_id uuid;
begin
  select pp.id into v_self_profile_id
  from public.patient_profiles pp
  where pp.account_id = auth.uid()
    and pp.relationship = 'self'
    and pp.archived_at is null
  limit 1;
  if v_self_profile_id is null then raise exception 'self patient profile is unavailable' using errcode='55000'; end if;
  return query select * from private.book_slot_internal(p_slot_id, p_offer_id, p_idempotency_key, v_self_profile_id);
end;
$$;

create or replace function public.book_slot(
  p_slot_id uuid,
  p_offer_id uuid,
  p_idempotency_key text,
  p_patient_profile_id uuid
)
returns table(booking_id uuid, booking_code text, booking_status text)
language sql
security definer
set search_path = ''
as $$
  select * from private.book_slot_internal(p_slot_id, p_offer_id, p_idempotency_key, p_patient_profile_id);
$$;

-- New account-based ownership is required for family bookings; patient_id remains
-- temporarily for compatibility with historic rows and downstream operational records.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select
  on public.bookings
  for select
  using (
    booked_by_user_id = (select auth.uid())
    or (select private.has_branch_access(bookings.branch_id, null::text[]))
  );

drop policy if exists bookings_update_authorized on public.bookings;
create policy bookings_update_authorized
  on public.bookings
  for update
  using (
    booked_by_user_id = (select auth.uid())
    or (select private.has_branch_access(bookings.branch_id, array['owner','manager','receptionist']))
    or (select private.is_platform_admin())
  )
  with check (
    booked_by_user_id = (select auth.uid())
    or (select private.has_branch_access(bookings.branch_id, array['owner','manager','receptionist']))
    or (select private.is_platform_admin())
  );

revoke all on function private.book_slot_internal(uuid,uuid,text,uuid) from public;
revoke all on function public.book_slot(uuid,uuid,text) from public, anon;
revoke all on function public.book_slot(uuid,uuid,text,uuid) from public, anon;
grant execute on function public.book_slot(uuid,uuid,text) to authenticated;
grant execute on function public.book_slot(uuid,uuid,text,uuid) to authenticated;

drop function if exists private.book_slot_internal(uuid,uuid,text);
