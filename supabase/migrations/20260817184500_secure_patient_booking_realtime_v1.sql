-- Secure patient identity, verified contact, clinic notification, integrity, and realtime foundations.
-- Historical patient profiles remain readable but cannot create new bookings until all required fields are complete and phone verification succeeds.

alter table public.patient_profiles
  add column if not exists national_id text,
  add column if not exists nationality text,
  add column if not exists phone text,
  add column if not exists phone_verified_at timestamptz;

alter table public.patient_profiles
  add constraint patient_profiles_national_id_format_check
    check (national_id is null or national_id ~ '^[0-9]{11}$'),
  add constraint patient_profiles_nationality_format_check
    check (nationality is null or nationality ~ '^[A-Z]{2}$'),
  add constraint patient_profiles_phone_format_check
    check (phone is null or phone ~ E'^\\+[1-9][0-9]{7,14}$'),
  add constraint patient_profiles_date_of_birth_not_future_check
    check (date_of_birth is null or date_of_birth <= current_date),
  add constraint patient_profiles_verified_phone_requires_phone_check
    check (phone_verified_at is null or phone is not null);

create unique index patient_profiles_national_id_key
  on public.patient_profiles (national_id)
  where national_id is not null;

create index patient_profiles_phone_idx
  on public.patient_profiles (phone)
  where phone is not null;

create table public.patient_phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  patient_profile_id uuid not null references public.patient_profiles(id) on delete restrict,
  phone text not null,
  code_hash text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_phone_verification_challenges_phone_check
    check (phone ~ E'^\\+[1-9][0-9]{7,14}$'),
  constraint patient_phone_verification_challenges_status_check
    check (status in ('pending', 'verified', 'expired', 'cancelled')),
  constraint patient_phone_verification_challenges_attempt_count_check
    check (attempt_count between 0 and 5),
  constraint patient_phone_verification_challenges_expiry_check
    check (expires_at > created_at),
  constraint patient_phone_verification_challenges_consumed_check
    check ((status in ('verified', 'cancelled', 'expired')) or consumed_at is null)
);

create index patient_phone_verification_challenges_account_idx
  on public.patient_phone_verification_challenges (account_id, created_at desc);
create index patient_phone_verification_challenges_profile_pending_idx
  on public.patient_phone_verification_challenges (patient_profile_id, expires_at desc)
  where status = 'pending';

alter table public.patient_phone_verification_challenges enable row level security;
revoke all on table public.patient_phone_verification_challenges from public, anon, authenticated;

create or replace function private.touch_patient_phone_verification_challenge_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_patient_phone_verification_challenge_updated_at() from public;

drop trigger if exists patient_phone_verification_challenges_touch_updated_at on public.patient_phone_verification_challenges;
create trigger patient_phone_verification_challenges_touch_updated_at
before update on public.patient_phone_verification_challenges
for each row execute function private.touch_patient_phone_verification_challenge_updated_at();

-- A profile must be complete and its stored phone must be verified before it can create a new booking.
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
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_patient_profile_id is null then raise exception 'patient profile is required' using errcode = '22023'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'invalid idempotency key' using errcode = '22023'; end if;

  select * into v_profile
  from public.patient_profiles
  where id = p_patient_profile_id
    and account_id = v_user
    and archived_at is null
  for key share;
  if not found then raise exception 'patient profile is not available for this account' using errcode = '42501'; end if;

  if v_profile.national_id is null
    or v_profile.nationality is null
    or v_profile.date_of_birth is null
    or v_profile.phone is null
    or v_profile.phone_verified_at is null then
    raise exception 'patient profile must be complete and phone verified' using errcode = '22023';
  end if;

  select * into v_existing
  from public.bookings
  where booked_by_user_id = v_user and idempotency_key = p_idempotency_key
  limit 1;
  if found then
    return query select v_existing.id, v_existing.booking_code, v_existing.status;
    return;
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then raise exception 'slot not found' using errcode = 'P0002'; end if;
  if v_slot.status <> 'published' or v_slot.start_at <= now() or (v_slot.expires_at is not null and v_slot.expires_at <= now()) then
    raise exception 'slot is not bookable' using errcode = 'P0001';
  end if;

  select o.*, b.clinic_id, b.status branch_status, c.status clinic_status,
         tc.code treatment_code, tc.name_ar treatment_name_ar, tc.name_en treatment_name_en,
         tv.variant_key, tv.name_ar variant_name_ar, tv.name_en variant_name_en
  into v_offer
  from public.branch_service_offers o
  join public.branches b on b.id = o.branch_id
  join public.clinics c on c.id = b.clinic_id
  join public.treatment_variants tv on tv.id = o.variant_id and tv.active
  join public.treatment_catalog tc on tc.id = tv.catalog_id and tc.active
  where o.id = p_offer_id and o.branch_id = v_slot.branch_id and o.variant_id = v_slot.variant_id
    and o.status = 'active' and o.effective_from <= now() and (o.effective_to is null or o.effective_to > now())
  limit 1;

  if not found or v_offer.branch_status <> 'active' or v_offer.clinic_status <> 'active' then
    raise exception 'offer or slot treatment is not eligible' using errcode = 'P0001';
  end if;
  if extract(epoch from (v_slot.end_at - v_slot.start_at)) / 60.0 < v_offer.duration_minutes then
    raise exception 'slot is shorter than clinical duration' using errcode = 'P0001';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_snapshot := jsonb_build_object(
    'offer_id', v_offer.id, 'treatment_code', v_offer.treatment_code,
    'treatment_name_ar', v_offer.treatment_name_ar, 'treatment_name_en', v_offer.treatment_name_en,
    'variant_key', v_offer.variant_key, 'variant_name_ar', v_offer.variant_name_ar, 'variant_name_en', v_offer.variant_name_en,
    'price_type', v_offer.price_type, 'min_minor', v_offer.min_minor, 'max_minor', v_offer.max_minor, 'currency', v_offer.currency,
    'duration_minutes', v_offer.duration_minutes,
    'consultation_included', v_offer.consultation_included, 'xray_included', v_offer.xray_included,
    'anesthesia_included', v_offer.anesthesia_included, 'lab_included', v_offer.lab_included,
    'included_items', v_offer.included_items, 'excluded_items', v_offer.excluded_items,
    'effective_from', v_offer.effective_from, 'clinic_attested_at', v_offer.clinic_attested_at,
    'last_verified_at', v_offer.last_verified_at, 'captured_at', now()
  );

  begin
    insert into public.bookings(
      patient_id, booked_by_user_id, patient_profile_id, clinic_id, branch_id,
      practitioner_id, resource_id, slot_id, offer_id, start_at, end_at,
      status, offer_snapshot, idempotency_key, booking_code
    ) values (
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
      raise exception 'slot already claimed' using errcode = 'P0001';
    when exclusion_violation then
      raise exception 'practitioner or resource already booked' using errcode = 'P0001';
  end;

  update public.availability_slots set status = 'held' where id = v_slot.id;
  insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, reason)
    values (v_booking.id, null, v_booking.status, v_user, 'booking_created');
  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
    values (v_user, 'booking.created', 'booking', v_booking.id::text, jsonb_build_object(
      'slot_id', v_slot.id, 'offer_id', v_offer.id, 'variant_id', v_slot.variant_id,
      'patient_profile_id', v_profile.id
    ));
  return query select v_booking.id, v_booking.booking_code, v_booking.status;
end;
$$;

-- Do not permit a patient browser session to mutate a booking row; workflow actions use dedicated server RPCs.
drop policy if exists bookings_update_authorized on public.bookings;
create policy bookings_update_authorized
  on public.bookings
  for update
  using (
    (select private.has_branch_access(bookings.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  )
  with check (
    (select private.has_branch_access(bookings.branch_id, array['owner', 'manager', 'receptionist']))
    or (select private.is_platform_admin())
  );

-- The center reads patient details only through this controlled projection. Viewer and pricing roles receive no PII.
create or replace function public.clinic_booking_patient_details(p_booking_ids uuid[] default null)
returns table(
  booking_id uuid,
  patient_display_name text,
  patient_relationship text,
  patient_national_id text,
  patient_nationality text,
  patient_date_of_birth date,
  patient_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.display_name else null end,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.relationship else null end,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.national_id else null end,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.nationality else null end,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.date_of_birth else null end,
    case when private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist']) then pp.phone else null end
  from public.bookings b
  join public.patient_profiles pp on pp.id = b.patient_profile_id
  where private.has_branch_access(b.branch_id, null::text[])
    and (p_booking_ids is null or b.id = any(p_booking_ids));
$$;

revoke all on function public.clinic_booking_patient_details(uuid[]) from public, anon;
grant execute on function public.clinic_booking_patient_details(uuid[]) to authenticated;

-- Notify the chosen clinic immediately when a booking is created, and notify the patient only after confirmation.
alter table public.notification_outbox
  drop constraint if exists notification_outbox_event_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_event_type_check
  check (event_type in ('booking_requested', 'booking_confirmed', 'booking_cancelled', 'booking_updated', 'attendance_recorded', 'price_updated', 'support_reply', 'manual'));

create or replace function private.enqueue_booking_confirmed_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_treatment_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending_clinic_confirmation' then
    v_treatment_name := coalesce(new.offer_snapshot ->> 'treatment_name_ar', new.offer_snapshot ->> 'variant_name_ar', new.offer_snapshot ->> 'treatment_name_en', new.offer_snapshot ->> 'variant_name_en', 'العلاج المختار');

    insert into public.notification_outbox (
      recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
    )
    select
      membership.user_id,
      'booking_requested',
      new.id::text,
      'push',
      'ar',
      jsonb_build_object(
        'booking_id', new.id,
        'booking_code', new.booking_code,
        'start_at', new.start_at,
        'clinic_id', new.clinic_id,
        'branch_id', new.branch_id,
        'treatment_name', v_treatment_name
      ),
      'booking_requested:' || new.id::text || ':' || membership.user_id::text || ':push:ar',
      'pending',
      new.booked_by_user_id
    from public.clinic_memberships membership
    where membership.clinic_id = new.clinic_id
      and membership.status = 'active'
      and membership.role in ('owner', 'manager', 'receptionist')
      and (membership.branch_id is null or membership.branch_id = new.branch_id)
    on conflict (dedupe_key) do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'confirmed' and old.status is distinct from new.status then
    insert into public.notification_outbox (
      recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
    ) values (
      new.booked_by_user_id,
      'booking_confirmed',
      new.id::text,
      'push',
      'ar',
      jsonb_build_object('booking_id', new.id, 'booking_code', new.booking_code, 'start_at', new.start_at, 'clinic_id', new.clinic_id),
      'booking_confirmed:' || new.id::text || ':' || new.booked_by_user_id::text || ':push:ar',
      'pending',
      new.booked_by_user_id
    ) on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_booking_confirmed_notifications() from public;

drop trigger if exists booking_confirmed_notification_outbox on public.bookings;
create trigger booking_confirmed_notification_outbox
after insert or update of status on public.bookings
for each row execute function private.enqueue_booking_confirmed_notifications();

-- Prevent duplicate operational slots and overlapping active offers for the same service in the same branch.
create unique index availability_slots_no_duplicate_operational_slot
  on public.availability_slots (
    branch_id,
    variant_id,
    start_at,
    end_at,
    coalesce(practitioner_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('draft', 'published', 'held');

alter table public.branch_service_offers
  add constraint branch_service_offers_no_active_effective_overlap
  exclude using gist (
    branch_id with =,
    variant_id with =,
    tstzrange(effective_from, coalesce(effective_to, 'infinity'::timestamptz), '[)') with &&
  )
  where (status = 'active');

-- Realtime events remain subject to RLS. Full replica identity gives subscribers the changed record on updates.
alter table public.bookings replica identity full;
alter table public.notification_outbox replica identity full;
alter table public.branch_service_offers replica identity full;
alter table public.availability_slots replica identity full;
alter table public.feature_flags replica identity full;
alter table public.treatment_catalog replica identity full;
alter table public.treatment_variants replica identity full;

do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach v_table in array array[
    'public.bookings',
    'public.notification_outbox',
    'public.branch_service_offers',
    'public.availability_slots',
    'public.feature_flags',
    'public.treatment_catalog',
    'public.treatment_variants'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = split_part(v_table, '.', 1)
        and tablename = split_part(v_table, '.', 2)
    ) then
      execute format('alter publication supabase_realtime add table %s', v_table);
    end if;
  end loop;
end;
$$;
