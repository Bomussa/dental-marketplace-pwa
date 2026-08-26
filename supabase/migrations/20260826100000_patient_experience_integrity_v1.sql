-- Patient experience integrity: short patient nicknames, phone uniqueness, in-app booking confirmations,
-- practitioner-gender matching, and access-safe patient account archival.
-- This migration intentionally does not remove the SMS phone-verification security prerequisite for booking.

-- A phone is a unique patient identity attribute, just as the existing national ID index is.
drop index if exists public.patient_profiles_phone_idx;
create unique index if not exists patient_profiles_phone_key
  on public.patient_profiles (phone)
  where phone is not null;

-- account_usernames is shared with clinic operators and historical accounts. Keep its broad legacy
-- constraint, and enforce the narrower 2–10 character rule only for new/renamed patient logins.
create or replace function private.enforce_patient_nickname()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_kind text;
begin
  select coalesce(u.raw_user_meta_data ->> 'account_kind', 'patient')
    into v_account_kind
  from auth.users u
  where u.id = new.user_id;

  if v_account_kind = 'patient' and new.username !~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,9}$' then
    raise exception 'PATIENT_NICKNAME_INVALID' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_patient_nickname() from public;

drop trigger if exists account_usernames_enforce_patient_nickname on public.account_usernames;
create trigger account_usernames_enforce_patient_nickname
before insert or update of username on public.account_usernames
for each row execute function private.enforce_patient_nickname();

-- Store practitioner gender only when declared by the clinic. A null value remains truthful for
-- historical practitioners and is never presented as a patient-selectable gender match.
alter table public.practitioners
  add column if not exists gender text;

alter table public.practitioners
  drop constraint if exists practitioners_gender_check;
alter table public.practitioners
  add constraint practitioners_gender_check
  check (gender is null or gender in ('female', 'male'));

create index if not exists practitioners_clinic_active_gender_idx
  on public.practitioners (clinic_id, active, gender)
  where active;

-- Booking confirmations are stored in the authenticated account. SMS is removed from the
-- notification contracts; phone SMS remains reserved for the separate verification flow.
alter table public.notification_preferences
  drop constraint if exists notification_preferences_channel_check;
alter table public.notification_preferences
  add constraint notification_preferences_channel_check
  check (channel in ('email', 'push', 'in_app'));

alter table public.notification_templates
  drop constraint if exists notification_templates_channel_check;
alter table public.notification_templates
  add constraint notification_templates_channel_check
  check (channel in ('email', 'push', 'in_app'));

alter table public.notification_outbox
  drop constraint if exists notification_outbox_channel_check;
alter table public.notification_outbox
  add constraint notification_outbox_channel_check
  check (channel in ('email', 'push', 'in_app'));

alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'suppressed', 'dead_letter', 'stored'));

-- Existing booking trigger is upgraded in place. It persists only source-of-truth booking and
-- branch data, including an arrival instruction rather than a fabricated timed reminder.
create or replace function private.enqueue_booking_confirmed_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_treatment_name text;
  v_clinic_name text;
  v_branch_name text;
  v_branch_area text;
  v_branch_address text;
  v_branch_latitude double precision;
  v_branch_longitude double precision;
begin
  select
    c.display_name,
    b.name,
    b.area,
    b.address_line,
    case when b.location is null then null else extensions.st_y(b.location::extensions.geometry) end,
    case when b.location is null then null else extensions.st_x(b.location::extensions.geometry) end
  into
    v_clinic_name,
    v_branch_name,
    v_branch_area,
    v_branch_address,
    v_branch_latitude,
    v_branch_longitude
  from public.branches b
  join public.clinics c on c.id = b.clinic_id
  where b.id = new.branch_id
  limit 1;

  v_treatment_name := coalesce(
    new.offer_snapshot ->> 'treatment_name_ar',
    new.offer_snapshot ->> 'variant_name_ar',
    new.offer_snapshot ->> 'treatment_name_en',
    new.offer_snapshot ->> 'variant_name_en',
    'العلاج المحدد'
  );

  if tg_op = 'INSERT' and new.status = 'pending_clinic_confirmation' then
    insert into public.notification_outbox (
      recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
    )
    select
      membership.user_id,
      'booking_requested',
      new.id::text,
      'in_app',
      'ar',
      jsonb_build_object(
        'booking_id', new.id,
        'booking_code', new.booking_code,
        'start_at', new.start_at,
        'clinic_id', new.clinic_id,
        'clinic_name', v_clinic_name,
        'branch_id', new.branch_id,
        'branch_name', v_branch_name,
        'branch_area', v_branch_area,
        'branch_address', v_branch_address,
        'branch_latitude', v_branch_latitude,
        'branch_longitude', v_branch_longitude,
        'treatment_name', v_treatment_name,
        'arrival_before_minutes', 30
      ),
      'booking_requested:' || new.id::text || ':' || membership.user_id::text || ':in_app:ar',
      'stored',
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
      'in_app',
      'ar',
      jsonb_build_object(
        'booking_id', new.id,
        'booking_code', new.booking_code,
        'start_at', new.start_at,
        'clinic_id', new.clinic_id,
        'clinic_name', v_clinic_name,
        'branch_id', new.branch_id,
        'branch_name', v_branch_name,
        'branch_area', v_branch_area,
        'branch_address', v_branch_address,
        'branch_latitude', v_branch_latitude,
        'branch_longitude', v_branch_longitude,
        'treatment_name', v_treatment_name,
        'arrival_before_minutes', 30
      ),
      'booking_confirmed:' || new.id::text || ':' || new.booked_by_user_id::text || ':in_app:ar',
      'stored',
      new.booked_by_user_id
    ) on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_booking_confirmed_notifications() from public;

-- Filter live offers by declared practitioner gender when the patient asks. An unfiltered search
-- still preserves historic unassigned slots, while a gender-filtered search returns only active,
-- assigned practitioners with a matching declared value.
revoke all on function public.search_dental_offers(uuid, double precision, double precision, double precision) from public;
drop function if exists public.search_dental_offers(uuid, double precision, double precision, double precision);

create function public.search_dental_offers(
  p_variant_id uuid,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 10,
  p_practitioner_gender text default null
)
returns table(
  offer_id uuid,
  clinic_id uuid,
  clinic_name text,
  branch_id uuid,
  branch_name text,
  area text,
  branch_address text,
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
  earliest_practitioner_id uuid,
  earliest_practitioner_name text,
  earliest_practitioner_gender text,
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
    b.address_line,
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
    es.practitioner_id,
    es.practitioner_name,
    es.practitioner_gender,
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
    select
      s.id,
      s.start_at,
      s.practitioner_id,
      p.display_name as practitioner_name,
      p.gender as practitioner_gender
    from public.availability_slots s
    left join public.practitioners p on p.id = s.practitioner_id
    where s.branch_id = b.id
      and s.variant_id = o.variant_id
      and s.status = 'published'
      and s.start_at > now()
      and (s.expires_at is null or s.expires_at > now())
      and extract(epoch from (s.end_at - s.start_at)) / 60.0 >= o.duration_minutes
      and (
        p_practitioner_gender is null
        or (p_practitioner_gender in ('female', 'male') and p.active and p.gender = p_practitioner_gender)
      )
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

grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision, text) to anon, authenticated;

-- Archive all patient profiles and disable their login name before the server deletes the Auth user
-- softly. Historical booking and audit relations stay intact instead of being broken or removed.
create or replace function public.archive_patient_account_server(
  p_actor_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_kind text;
  v_target_is_platform_admin boolean;
  v_archived_profiles integer;
begin
  if p_actor_id is null or p_target_user_id is null then
    raise exception 'ACTOR_AND_TARGET_REQUIRED' using errcode = '22023';
  end if;

  if p_actor_id <> p_target_user_id and not private.is_platform_admin_for_actor(p_actor_id) then
    raise exception 'PATIENT_OR_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select
    coalesce(u.raw_user_meta_data ->> 'account_kind', 'patient'),
    coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
  into v_account_kind, v_target_is_platform_admin
  from auth.users u
  where u.id = p_target_user_id;

  if not found then
    raise exception 'PATIENT_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_account_kind <> 'patient' or v_target_is_platform_admin then
    raise exception 'PATIENT_ACCOUNT_REQUIRED' using errcode = '22023';
  end if;

  update public.account_usernames
  set disabled_at = coalesce(disabled_at, now())
  where user_id = p_target_user_id;

  update public.profiles
  set display_name = 'Deleted patient account', phone = null
  where id = p_target_user_id;

  update public.patient_profiles
  set archived_at = coalesce(archived_at, now())
  where account_id = p_target_user_id;
  get diagnostics v_archived_profiles = row_count;

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'patient_account.archived',
    'patient_account',
    p_target_user_id::text,
    jsonb_build_object(
      'self_service', p_actor_id = p_target_user_id,
      'archived_profile_count', v_archived_profiles
    )
  );
end;
$$;

revoke all on function public.archive_patient_account_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.archive_patient_account_server(uuid, uuid) to service_role;

-- A soft-deleted account's short-lived pre-existing JWT cannot read its patient profiles or booking
-- history after archival. Clinic and platform-admin access remains unchanged.
drop policy if exists patient_profiles_select_own on public.patient_profiles;
create policy patient_profiles_select_own
  on public.patient_profiles
  for select
  to authenticated
  using (account_id = (select auth.uid()) and archived_at is null);

drop policy if exists bookings_select on public.bookings;
create policy bookings_select
  on public.bookings
  for select
  using (
    (
      booked_by_user_id = (select auth.uid())
      and exists (
        select 1
        from public.patient_profiles pp
        where pp.account_id = (select auth.uid())
          and pp.relationship = 'self'
          and pp.archived_at is null
      )
    )
    or (select private.has_branch_access(bookings.branch_id, null::text[]))
    or (select private.is_platform_admin())
  );

create or replace function private.is_account_login_disabled(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_usernames u
    where u.user_id = p_user_id and u.disabled_at is not null
  )
$$;

revoke all on function private.is_account_login_disabled(uuid) from public;

drop policy if exists "users read own notification outbox" on public.notification_outbox;
create policy "users read own notification outbox" on public.notification_outbox
  for select
  using (
    (
      recipient_user_id = (select auth.uid())
      and not private.is_account_login_disabled((select auth.uid()))
    )
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );
