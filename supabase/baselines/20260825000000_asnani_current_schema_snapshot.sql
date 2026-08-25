-- Asnani current-schema baseline (catalog-only; no row data, secrets, or Auth users).
-- Generated from a read-only catalog snapshot. Regenerate with scripts/generate-schema-baseline.py.
-- This is a snapshot track and must be applied alone to a fresh database; do not combine it with the legacy incremental track.
begin;

create schema if not exists private;
revoke all on schema private from public;

-- BEGIN asnani-production-extensions-types-ddl

create extension if not exists "uuid-ossp" with schema extensions;

create extension if not exists btree_gist with schema extensions;

create extension if not exists pg_stat_statements with schema extensions;

create extension if not exists pgcrypto with schema extensions;

create extension if not exists postgis with schema extensions;

create extension if not exists supabase_vault with schema vault;

-- END asnani-production-extensions-types-ddl

-- BEGIN asnani-production-table-ddl

create table public.account_usernames (
  user_id uuid not null,
  username text not null,
  disabled_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.accounting_journal_lines (
  id uuid not null default gen_random_uuid(),
  journal_id uuid not null,
  line_no smallint not null,
  account_code text not null,
  debit_minor integer not null default 0,
  credit_minor integer not null default 0,
  memo text,
  created_at timestamp with time zone not null default now()
);

create table public.accounting_journals (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  branch_id uuid,
  settlement_period_id uuid,
  source_type text not null,
  source_id text not null,
  journal_type text not null,
  status text not null default 'draft'::text,
  currency character(3) not null default 'QAR'::bpchar,
  occurred_at timestamp with time zone not null default now(),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  posted_by uuid,
  posted_at timestamp with time zone,
  reversed_journal_id uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.audit_events (
  id bigint generated always as identity not null,
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.availability_slots (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null,
  practitioner_id uuid,
  resource_id uuid,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  status text not null default 'draft'::text,
  freshness_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  variant_id uuid not null
);

create table public.booking_attendance_events (
  id uuid not null default gen_random_uuid(),
  booking_id uuid not null,
  event_type text not null,
  reason text,
  occurred_at timestamp with time zone not null default now(),
  recorded_by uuid not null,
  source_type text not null default 'clinic_ui'::text,
  source_id text,
  created_at timestamp with time zone not null default now(),
  sequence_no integer not null
);

create table public.booking_status_history (
  id bigint generated always as identity not null,
  booking_id uuid not null,
  from_status text,
  to_status text not null,
  actor_id uuid,
  reason text,
  created_at timestamp with time zone not null default now()
);

create table public.bookings (
  id uuid not null default gen_random_uuid(),
  patient_id uuid not null,
  clinic_id uuid not null,
  branch_id uuid not null,
  practitioner_id uuid,
  resource_id uuid,
  slot_id uuid not null,
  offer_id uuid not null,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  booking_period tstzrange generated always as (tstzrange(start_at, end_at, '[)'::text)) stored,
  status text not null default 'pending_hold'::text,
  offer_snapshot jsonb not null,
  idempotency_key text not null,
  booking_code text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  booked_by_user_id uuid not null,
  patient_profile_id uuid not null
);

create table public.branch_hour_exceptions (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null,
  local_date date not null,
  open_time time without time zone,
  close_time time without time zone,
  is_closed boolean not null default false,
  reason text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.branch_hours (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null,
  weekday smallint not null,
  open_time time without time zone,
  close_time time without time zone,
  is_closed boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.branch_service_offers (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null,
  variant_id uuid not null,
  price_type text not null,
  min_minor integer,
  max_minor integer,
  currency character(3) not null default 'QAR'::bpchar,
  consultation_included boolean,
  xray_included boolean,
  anesthesia_included boolean,
  lab_included boolean,
  included_items jsonb not null default '[]'::jsonb,
  excluded_items jsonb not null default '[]'::jsonb,
  materials jsonb not null default '{}'::jsonb,
  visit_count integer,
  follow_up_terms text,
  notes text,
  effective_from timestamp with time zone not null default now(),
  effective_to timestamp with time zone,
  clinic_attested_at timestamp with time zone,
  last_verified_at timestamp with time zone,
  verified_by uuid,
  status text not null default 'draft'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  duration_minutes integer not null default 30,
  price_scope jsonb not null default jsonb_build_object('registration', 'not_confirmed', 'examination', 'not_confirmed', 'xray', 'not_confirmed', 'diagnostics', 'not_confirmed', 'anesthesia', 'not_confirmed', 'laboratory', 'not_confirmed', 'medications', 'not_confirmed'),
  scope_confirmed_at timestamp with time zone
);

create table public.branches (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  name text not null,
  address_line text,
  area text,
  location geography(Point,4326),
  timezone text not null default 'Asia/Qatar'::text,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.clinic_fee_rules (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  branch_id uuid,
  fee_type text not null,
  fixed_minor integer,
  rate_bps integer,
  currency character(3) not null default 'QAR'::bpchar,
  effective_from timestamp with time zone not null default now(),
  effective_to timestamp with time zone,
  status text not null default 'active'::text,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.clinic_memberships (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  clinic_id uuid not null,
  branch_id uuid,
  role text not null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.clinic_operator_account_events (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  operator_account_id uuid,
  operator_user_id uuid not null,
  actor_user_id uuid not null,
  event_type text not null,
  created_at timestamp with time zone not null default now()
);

create table public.clinic_operator_accounts (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  user_id uuid not null,
  membership_id uuid not null,
  slot_no smallint not null,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone
);

create table public.clinics (
  id uuid not null default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_synthetic boolean not null default false
);

create table public.consent_records (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  consent_type text not null,
  policy_version text not null,
  policy_hash text not null,
  action text not null,
  created_at timestamp with time zone not null default now()
);

create table public.customer_choice_events (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  session_id uuid not null,
  event_name text not null,
  page_path text not null default '/'::text,
  treatment_id uuid,
  variant_id uuid,
  offer_id uuid,
  slot_id uuid,
  choice_value jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.device_installations (
  id uuid not null default gen_random_uuid(),
  installation_id uuid not null,
  account_id uuid,
  device_label text,
  platform text,
  browser text,
  device_class text,
  app_version text,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.feature_flags (
  key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

create table public.idempotency_keys (
  id uuid not null default gen_random_uuid(),
  scope text not null,
  user_id uuid,
  key text not null,
  request_hash text,
  response_ref text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now()
);

create table public.instant_slots (
  id uuid not null default gen_random_uuid(),
  slot_id uuid not null,
  offer_id uuid not null,
  arrival_deadline timestamp with time zone not null,
  publish_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  status text not null default 'draft'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.notification_delivery_attempts (
  id uuid not null default gen_random_uuid(),
  outbox_id uuid not null,
  attempt_no integer not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_code text,
  error_detail text,
  attempted_at timestamp with time zone not null default now(),
  delivered_at timestamp with time zone
);

create table public.notification_outbox (
  id uuid not null default gen_random_uuid(),
  recipient_user_id uuid not null,
  template_id uuid,
  event_type text not null,
  event_id text not null,
  channel text not null,
  locale text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  status text not null default 'pending'::text,
  attempt_count integer not null default 0,
  next_attempt_at timestamp with time zone not null default now(),
  provider text,
  provider_message_id text,
  last_error_code text,
  last_error_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.notification_preferences (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  channel text not null,
  purpose text not null,
  enabled boolean not null default false,
  destination_ref text,
  consented_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.notification_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  channel text not null,
  endpoint text not null,
  consented_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table public.notification_templates (
  id uuid not null default gen_random_uuid(),
  template_key text not null,
  channel text not null,
  locale text not null,
  version integer not null default 1,
  subject text,
  body text not null,
  status text not null default 'draft'::text,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.offer_revisions (
  id uuid not null default gen_random_uuid(),
  offer_id uuid not null,
  revision_no integer not null,
  previous_snapshot jsonb not null default '{}'::jsonb,
  proposed_snapshot jsonb not null default '{}'::jsonb,
  reason text not null,
  status text not null default 'draft'::text,
  requested_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.patient_phone_verification_challenges (
  id uuid not null default gen_random_uuid(),
  account_id uuid not null,
  patient_profile_id uuid not null,
  phone text not null,
  code_hash text not null,
  status text not null default 'pending'::text,
  attempt_count integer not null default 0,
  expires_at timestamp with time zone not null,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.patient_profiles (
  id uuid not null default gen_random_uuid(),
  account_id uuid not null,
  display_name text not null,
  relationship text not null default 'self'::text,
  date_of_birth date,
  gender text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone,
  national_id text,
  nationality text,
  phone text,
  phone_verified_at timestamp with time zone
);

create table public.payment_events (
  id bigint generated always as identity not null,
  payment_intent_id uuid,
  provider_event_id text not null,
  event_type text not null,
  raw_hash text not null,
  received_at timestamp with time zone not null default now()
);

create table public.payment_intents (
  id uuid not null default gen_random_uuid(),
  booking_id uuid not null,
  provider text not null,
  amount_minor integer not null,
  currency character(3) not null default 'QAR'::bpchar,
  status text not null,
  provider_ref text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.practitioners (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  display_name text not null,
  license_ref text,
  active boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.price_disputes (
  id uuid not null default gen_random_uuid(),
  booking_id uuid,
  offer_id uuid,
  branch_id uuid not null,
  reporter_id uuid not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open'::text,
  resolution text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.profiles (
  id uuid not null,
  display_name text,
  phone text,
  locale text not null default 'ar'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.rate_limit_buckets (
  scope text not null,
  subject_key text not null,
  window_started_at timestamp with time zone not null,
  request_count integer not null default 0,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.reconciliation_exceptions (
  id uuid not null default gen_random_uuid(),
  payment_intent_id uuid,
  booking_id uuid,
  exception_type text not null,
  status text not null default 'open'::text,
  owner_id uuid,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.report_exports (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid,
  settlement_period_id uuid,
  report_kind text not null,
  format text not null,
  filters jsonb not null default '{}'::jsonb,
  content_hash text,
  status text not null default 'queued'::text,
  requested_by uuid not null,
  generated_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table public.resources (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null,
  resource_type text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.reviews (
  id uuid not null default gen_random_uuid(),
  booking_id uuid not null,
  patient_id uuid not null,
  clinic_id uuid not null,
  practitioner_id uuid,
  rating smallint not null,
  review_text text,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.settlement_periods (
  id uuid not null default gen_random_uuid(),
  clinic_id uuid not null,
  period_start date not null,
  period_end date not null,
  period_kind text not null,
  status text not null default 'open'::text,
  currency character(3) not null default 'QAR'::bpchar,
  created_by uuid not null,
  approved_by uuid,
  closed_by uuid,
  approved_at timestamp with time zone,
  closed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.support_conversations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  locale text not null,
  status text not null default 'open'::text,
  safety_category text,
  escalation_reason text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone
);

create table public.support_knowledge_articles (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  locale text not null,
  version integer not null default 1,
  title text not null,
  body_markdown text not null,
  category text not null,
  audience text not null default 'public'::text,
  status text not null default 'draft'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.support_messages (
  id uuid not null default gen_random_uuid(),
  conversation_id uuid not null,
  role text not null,
  content text not null,
  policy_version text,
  safety_category text,
  confidence numeric(4,3),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.suspensions (
  id uuid not null default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  severity text not null,
  reason text not null,
  status text not null default 'active'::text,
  appeal_text text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.treatment_catalog (
  id uuid not null default gen_random_uuid(),
  code text not null,
  category text not null,
  name_ar text not null,
  name_en text not null,
  comparison_version integer not null default 1,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.treatment_variants (
  id uuid not null default gen_random_uuid(),
  catalog_id uuid not null,
  variant_key text not null,
  name_ar text not null,
  name_en text not null,
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.verification_records (
  id uuid not null default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  source text not null,
  identifier text,
  status text not null,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone,
  evidence jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);

-- END asnani-production-table-ddl

-- BEGIN asnani-production-functions-ddl

CREATE OR REPLACE FUNCTION private.activity_report_json(p_clinic_id uuid, p_start date, p_end date, p_granularity text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.book_slot_internal(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid)
 RETURNS TABLE(booking_id uuid, booking_code text, booking_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.create_clinic_application_internal(p_legal_name text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_clinic_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode='28000';
  end if;
  if length(trim(coalesce(p_legal_name,''))) < 2 or length(trim(coalesce(p_display_name,''))) < 2 then
    raise exception 'clinic names are required' using errcode='22023';
  end if;
  if exists (
    select 1 from public.clinic_memberships m
    join public.clinics c on c.id=m.clinic_id
    where m.user_id=v_user and m.role='owner' and m.status='active'
      and c.status in ('pending','active','suspended')
  ) then
    raise exception 'an owner clinic application already exists' using errcode='23505';
  end if;

  insert into public.clinics(legal_name, display_name, status)
  values (trim(p_legal_name), trim(p_display_name), 'pending')
  returning id into v_clinic_id;

  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (v_user, v_clinic_id, null, 'owner', 'active');

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (v_user, 'clinic.application_created', 'clinic', v_clinic_id::text, '{}'::jsonb);

  return v_clinic_id;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_booking_state_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.enforce_offer_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
    if not exists (
      select 1 from public.branches b join public.clinics c on c.id=b.clinic_id
      where b.id=new.branch_id and b.status='active' and c.status='active'
    ) then raise exception 'offer cannot activate before clinic and branch are active'; end if;
    if new.clinic_attested_at is null then new.clinic_attested_at := now(); end if;
    if new.effective_to is not null and new.effective_to <= now() then raise exception 'offer effective_to is already expired'; end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_slot_publication()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
    if new.start_at <= now() then raise exception 'published slot must start in the future'; end if;
    if not exists (select 1 from public.branches b join public.clinics c on c.id=b.clinic_id where b.id=new.branch_id and b.status='active' and c.status='active') then
      raise exception 'slot cannot publish before clinic and branch are active';
    end if;
    if not exists (
      select 1 from public.branch_service_offers o
      where o.branch_id=new.branch_id and o.variant_id=new.variant_id and o.status='active'
        and o.effective_from<=now() and (o.effective_to is null or o.effective_to>now())
        and extract(epoch from (new.end_at-new.start_at))/60.0 >= o.duration_minutes
    ) then raise exception 'slot requires an active matching offer with compatible duration'; end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_verified_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_type text;
  v_id uuid;
  v_activating boolean;
begin
  if tg_table_name='clinics' then
    v_type := 'clinic';
    v_id := new.id;
    v_activating := new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active');
  elsif tg_table_name='branches' then
    v_type := 'branch';
    v_id := new.id;
    v_activating := new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active');
  elsif tg_table_name='practitioners' then
    v_type := 'practitioner';
    v_id := new.id;
    v_activating := new.active and (tg_op='INSERT' or old.active is distinct from true);
  else
    return new;
  end if;

  if v_activating and not exists (
    select 1 from public.verification_records vr
    where vr.subject_type=v_type
      and vr.subject_id=v_id
      and vr.status='verified'
      and (vr.expires_at is null or vr.expires_at > now())
  ) then
    raise exception '% % cannot be activated without a current verified record', v_type, v_id using errcode='P0001';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enqueue_attendance_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare booking_row public.bookings%rowtype;
begin
  if new.event_type <> 'checked_in' then return new; end if;
  select * into booking_row from public.bookings where id = new.booking_id;
  if not found then return new; end if;

  insert into public.notification_outbox (
    recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
  ) values (
    booking_row.patient_id,
    'attendance_recorded',
    new.id::text,
    'push',
    'ar',
    jsonb_build_object('booking_id', booking_row.id, 'booking_code', booking_row.booking_code, 'attendance_event_id', new.id, 'occurred_at', new.occurred_at),
    'attendance_recorded:' || new.id::text || ':' || booking_row.patient_id::text || ':push:ar',
    'pending',
    new.recorded_by
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enqueue_booking_confirmed_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_treatment_name_ar text;
  v_treatment_name_en text;
begin
  if tg_op = 'INSERT' and new.status = 'pending_clinic_confirmation' then
    v_treatment_name_ar := coalesce(
      new.offer_snapshot ->> 'treatment_name_ar',
      new.offer_snapshot ->> 'variant_name_ar',
      new.offer_snapshot ->> 'treatment_name_en',
      new.offer_snapshot ->> 'variant_name_en',
      'العلاج المختار'
    );
    v_treatment_name_en := coalesce(
      new.offer_snapshot ->> 'treatment_name_en',
      new.offer_snapshot ->> 'variant_name_en',
      new.offer_snapshot ->> 'treatment_name_ar',
      new.offer_snapshot ->> 'variant_name_ar',
      'Selected treatment'
    );

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
        'treatment_name', v_treatment_name_ar,
        'treatment_name_ar', v_treatment_name_ar,
        'treatment_name_en', v_treatment_name_en
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
$function$;

CREATE OR REPLACE FUNCTION private.guard_accounting_journal_lines()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_journal_id uuid := coalesce(new.journal_id, old.journal_id);
  journal_status text;
begin
  select status into journal_status from public.accounting_journals where id = target_journal_id;
  if journal_status in ('posted','reversed','void') then
    raise exception 'accounting journal lines are immutable after posting' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_accounting_journal_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  total_debit bigint;
  total_credit bigint;
begin
  if old.status in ('posted','reversed','void') then
    raise exception 'posted, reversed and void accounting journals are immutable; create a linked corrective journal' using errcode = '55000';
  end if;

  if new.status = 'posted' and old.status <> 'posted' then
    select coalesce(sum(debit_minor),0), coalesce(sum(credit_minor),0)
      into total_debit, total_credit
      from public.accounting_journal_lines
     where journal_id = old.id;
    if total_debit = 0 or total_debit <> total_credit then
      raise exception 'accounting journal % must contain balanced non-zero lines before posting', old.id
        using errcode = '23514';
    end if;
    if new.posted_by is null or new.posted_at is null then
      raise exception 'posted accounting journal requires actor and timestamp' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_compliance_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if v_privileged then return new; end if;
  if tg_op='INSERT' then
    if new.status <> 'pending' then raise exception 'new clinic/branch must start pending'; end if;
  elsif new.status is distinct from old.status and new.status in ('active','suspended','rejected') then
    raise exception 'compliance status can only be changed by platform admin';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_offer_verification_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if not v_privileged then
    if tg_op='INSERT' and (new.last_verified_at is not null or new.verified_by is not null) then
      raise exception 'platform verification fields are admin-only';
    elsif tg_op='UPDATE' and (new.last_verified_at is distinct from old.last_verified_at or new.verified_by is distinct from old.verified_by) then
      raise exception 'platform verification fields are admin-only';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_review_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if v_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'new review must start pending' using errcode='42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.status <> 'pending' then
      raise exception 'only pending reviews can be edited by patient' using errcode='42501';
    end if;

    if new.status is distinct from old.status then
      raise exception 'review moderation status is admin-only' using errcode='42501';
    end if;

    if new.booking_id is distinct from old.booking_id
       or new.patient_id is distinct from old.patient_id
       or new.clinic_id is distinct from old.clinic_id
       or new.practitioner_id is distinct from old.practitioner_id then
      raise exception 'review ownership fields are immutable' using errcode='42501';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles(id, display_name, phone, locale)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')), ''),
    new.phone,
    case when new.raw_user_meta_data->>'locale' in ('ar','en') then new.raw_user_meta_data->>'locale' else 'ar' end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.has_branch_access(p_branch_id uuid, p_roles text[] DEFAULT NULL::text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.branches b
    join public.clinic_memberships m on m.clinic_id = b.clinic_id
    where b.id = p_branch_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (m.branch_id is null or m.branch_id = p_branch_id)
      and (p_roles is null or m.role = any(p_roles))
  );
$function$;

CREATE OR REPLACE FUNCTION private.has_clinic_role(p_clinic_id uuid, p_branch_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role = any(p_roles)
      and ((p_branch_id is null and cm.branch_id is null) or (p_branch_id is not null and (cm.branch_id is null or cm.branch_id = p_branch_id)))
  )
$function$;

CREATE OR REPLACE FUNCTION private.has_clinic_role_for_actor(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = p_actor_id
      and cm.status = 'active'
      and cm.role = any(p_roles)
      and ((p_branch_id is null and cm.branch_id is null) or (p_branch_id is not null and (cm.branch_id is null or cm.branch_id = p_branch_id)))
  )
$function$;

CREATE OR REPLACE FUNCTION private.is_clinic_member(p_clinic_id uuid, p_roles text[] DEFAULT NULL::text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.clinic_memberships m
    where m.user_id = auth.uid()
      and m.clinic_id = p_clinic_id
      and m.status = 'active'
      and (p_roles is null or m.role = any(p_roles))
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false)
$function$;

CREATE OR REPLACE FUNCTION private.is_platform_admin_for_actor(p_actor_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
  from auth.users u where u.id = p_actor_id
$function$;

CREATE OR REPLACE FUNCTION private.is_platform_super_admin_for_actor(p_actor_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
    and coalesce((u.raw_app_meta_data ->> 'platform_super_admin')::boolean, false)
  from auth.users u
  where u.id = p_actor_id
$function$;

CREATE OR REPLACE FUNCTION private.log_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status is distinct from old.status then
    insert into public.booking_status_history(booking_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.prevent_booking_snapshot_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.offer_snapshot is distinct from old.offer_snapshot then
    raise exception 'offer_snapshot is immutable';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.sync_slot_on_booking_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status in ('pending_hold','pending_clinic_confirmation','confirmed','checked_in') then
    update public.availability_slots set status='held' where id=new.slot_id;
    update public.instant_slots set status='consumed' where slot_id=new.slot_id and status='published';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.sync_slot_on_booking_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_release boolean := false;
  v_consume boolean := false;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status in ('patient_cancelled','clinic_cancelled','expired','failed')
     and old.status in ('pending_hold','pending_clinic_confirmation','confirmed') then
    v_release := true;
  elsif new.status in ('completed','no_show') or old.status='checked_in' then
    v_consume := true;
  end if;

  if v_release then
    update public.availability_slots s
    set status = case
      when s.start_at>now() and (s.expires_at is null or s.expires_at>now()) then 'published'
      else 'expired'
    end
    where s.id=new.slot_id
      and not exists (
        select 1 from public.bookings b
        where b.slot_id=new.slot_id and b.id<>new.id
          and b.status in ('pending_hold','pending_clinic_confirmation','confirmed','checked_in')
      );

    update public.instant_slots i
    set status = case
      when i.expires_at>now() and i.arrival_deadline>now() then 'published'
      else 'expired'
    end
    where i.slot_id=new.slot_id;
  elsif v_consume then
    update public.availability_slots set status='consumed' where id=new.slot_id;
    update public.instant_slots set status='consumed' where slot_id=new.slot_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_account_username_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_device_installation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_patient_phone_verification_challenge_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_patient_profile_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_customer_choice_analytics(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
    select e.event_name, e.session_id, e.treatment_id, e.variant_id, e.choice_value, e.created_at
    from public.customer_choice_events e
    where e.created_at >= v_since
  ),
  session_flags as (
    select
      session_id,
      bool_or(event_name = 'search_submitted') as had_search,
      bool_or(event_name = 'offer_booking_clicked') as had_booking_click,
      bool_or(event_name = 'booking_login_required') as had_login_required,
      bool_or(event_name = 'booking_succeeded') as had_booking_success,
      bool_or(event_name = 'booking_failed') as had_booking_failure,
      bool_or(event_name = 'location_requested') as had_location_request,
      bool_or(event_name = 'location_acquired') as had_location_acquired,
      bool_or(event_name = 'location_denied') as had_location_denied,
      bool_or(event_name = 'search_submitted' and (choice_value ->> 'location_used') = 'true') as had_search_with_location
    from filtered
    group by session_id
  ),
  metrics as (
    select
      count(*)::bigint as total_events,
      count(distinct session_id)::bigint as unique_sessions,
      count(*) filter (where event_name = 'search_submitted')::bigint as searches,
      count(distinct session_id) filter (where event_name = 'search_submitted')::bigint as search_sessions,
      count(*) filter (where event_name = 'offer_booking_clicked')::bigint as booking_clicks,
      count(distinct session_id) filter (where event_name = 'offer_booking_clicked')::bigint as booking_click_sessions,
      count(*) filter (where event_name = 'booking_login_required')::bigint as login_required,
      count(distinct session_id) filter (where event_name = 'booking_login_required')::bigint as login_required_sessions,
      count(*) filter (where event_name = 'booking_succeeded')::bigint as booking_successes,
      count(distinct session_id) filter (where event_name = 'booking_succeeded')::bigint as booking_success_sessions,
      count(*) filter (where event_name = 'booking_failed')::bigint as booking_failures,
      count(distinct session_id) filter (where event_name = 'booking_failed')::bigint as booking_failure_sessions,
      count(*) filter (where event_name = 'location_requested')::bigint as location_requested,
      count(distinct session_id) filter (where event_name = 'location_requested')::bigint as location_requested_sessions,
      count(*) filter (where event_name = 'location_acquired')::bigint as location_acquired,
      count(distinct session_id) filter (where event_name = 'location_acquired')::bigint as location_acquired_sessions,
      count(*) filter (where event_name = 'location_denied')::bigint as location_denied,
      count(distinct session_id) filter (where event_name = 'location_denied')::bigint as location_denied_sessions,
      count(*) filter (where event_name = 'search_submitted' and (choice_value ->> 'location_used') = 'true')::bigint as searches_with_location,
      count(distinct session_id) filter (where event_name = 'search_submitted' and (choice_value ->> 'location_used') = 'true')::bigint as searches_with_location_sessions,
      (select count(*)::bigint from session_flags where had_search and had_booking_click) as search_to_click_sessions,
      (select count(*)::bigint from session_flags where had_booking_click and had_booking_success) as click_to_success_sessions,
      (select count(*)::bigint from session_flags where had_search and had_booking_success) as search_to_success_sessions,
      (select count(*)::bigint from session_flags where had_location_request and had_location_acquired) as location_request_to_acquired_sessions,
      max(created_at) as last_event_at
    from filtered
  ),
  top_treatments as (
    select e.treatment_id as id, c.name_ar, c.name_en, count(*)::bigint as searches, count(distinct e.session_id)::bigint as search_sessions
    from filtered e
    join public.treatment_catalog c on c.id = e.treatment_id
    where e.event_name = 'search_submitted' and e.treatment_id is not null
    group by e.treatment_id, c.name_ar, c.name_en
    order by count(*) desc, count(distinct e.session_id) desc, c.name_ar
    limit 10
  ),
  top_variants as (
    select e.variant_id as id, v.name_ar, v.name_en, c.name_ar as treatment_name_ar, count(*)::bigint as searches, count(distinct e.session_id)::bigint as search_sessions
    from filtered e
    join public.treatment_variants v on v.id = e.variant_id
    join public.treatment_catalog c on c.id = v.catalog_id
    where e.event_name = 'search_submitted' and e.variant_id is not null
    group by e.variant_id, v.name_ar, v.name_en, c.name_ar
    order by count(*) desc, count(distinct e.session_id) desc, v.name_ar
    limit 10
  ),
  appointment_preferences as (
    select
      case when e.choice_value ->> 'when' in ('earliest', 'today', 'tomorrow') then e.choice_value ->> 'when' else 'unknown' end as preference,
      count(*)::bigint as searches,
      count(distinct e.session_id)::bigint as search_sessions
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1
    order by count(*) desc, count(distinct e.session_id) desc, 1
  ),
  weekday_searches as (
    select extract(isodow from (e.created_at at time zone 'Asia/Qatar'))::integer as iso_day, count(*)::bigint as searches, count(distinct e.session_id)::bigint as search_sessions
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1 order by 1
  ),
  hourly_searches as (
    select extract(hour from (e.created_at at time zone 'Asia/Qatar'))::integer as hour, count(*)::bigint as searches, count(distinct e.session_id)::bigint as search_sessions
    from filtered e
    where e.event_name = 'search_submitted'
    group by 1 order by 1
  ),
  recent_events as (
    select e.event_name, e.created_at, c.name_ar as treatment_name_ar, c.name_en as treatment_name_en, v.name_ar as variant_name_ar, v.name_en as variant_name_en
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
    'top_treatments', coalesce((select jsonb_agg(to_jsonb(t) order by t.searches desc, t.search_sessions desc, t.name_ar) from top_treatments t), '[]'::jsonb),
    'top_variants', coalesce((select jsonb_agg(to_jsonb(v) order by v.searches desc, v.search_sessions desc, v.name_ar) from top_variants v), '[]'::jsonb),
    'appointment_preferences', coalesce((select jsonb_agg(to_jsonb(a) order by a.searches desc, a.search_sessions desc, a.preference) from appointment_preferences a), '[]'::jsonb),
    'weekday_searches', coalesce((select jsonb_agg(to_jsonb(w) order by w.iso_day) from weekday_searches w), '[]'::jsonb),
    'hourly_searches', coalesce((select jsonb_agg(to_jsonb(h) order by h.hour) from hourly_searches h), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent_events r), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_clinic_operator_password_reset(p_operator_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator
  from public.clinic_operator_accounts
  where id = p_operator_account_id
    and revoked_at is null;

  if not found then
    raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, v_actor_id, 'password_reset');
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_clinic_operator_password_reset_server(p_actor_id uuid, p_operator_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator from public.clinic_operator_accounts where id = p_operator_account_id and revoked_at is null;
  if not found then raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'password_reset');
end;
$function$;

CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text)
 RETURNS TABLE(booking_id uuid, booking_code text, booking_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid)
 RETURNS TABLE(booking_id uuid, booking_code text, booking_status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select * from private.book_slot_internal(p_slot_id, p_offer_id, p_idempotency_key, p_patient_profile_id);
$function$;

CREATE OR REPLACE FUNCTION public.book_slot_server(p_actor_id uuid, p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid)
 RETURNS TABLE(booking_id uuid, booking_code text, booking_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  return query
  select *
  from private.book_slot_internal(p_slot_id, p_offer_id, p_idempotency_key, p_patient_profile_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking_server(p_actor_id uuid, p_booking_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_booking public.bookings%rowtype;
  v_previous_status text;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  if v_booking.booked_by_user_id <> p_actor_id then
    raise exception 'not authorized for this booking' using errcode = '42501';
  end if;

  if v_booking.status = 'patient_cancelled' then
    return v_booking.status;
  end if;

  if v_booking.status not in ('pending_clinic_confirmation', 'confirmed') then
    raise exception 'booking cannot be cancelled from current state' using errcode = '55000';
  end if;

  if v_booking.start_at <= now() then
    raise exception 'past bookings cannot be cancelled' using errcode = '55000';
  end if;

  v_previous_status := v_booking.status;

  update public.bookings
  set status = 'patient_cancelled'
  where id = v_booking.id;

  update public.availability_slots
  set status = 'published'
  where id = v_booking.slot_id
    and status = 'held';

  insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, reason)
  values (v_booking.id, v_previous_status, 'patient_cancelled', p_actor_id, 'patient_cancelled');

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (p_actor_id, 'booking.cancelled', 'booking', v_booking.id::text, jsonb_build_object('previous_status', v_previous_status, 'slot_id', v_booking.slot_id));

  insert into public.notification_outbox(recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by)
  values (v_booking.booked_by_user_id, 'booking_cancelled', v_booking.id::text, 'push', 'ar', jsonb_build_object('booking_id', v_booking.id, 'booking_code', v_booking.booking_code, 'start_at', v_booking.start_at, 'clinic_id', v_booking.clinic_id), 'booking_cancelled:' || v_booking.id::text || ':' || v_booking.booked_by_user_id::text || ':push:ar', 'pending', p_actor_id)
  on conflict (dedupe_key) do nothing;

  insert into public.notification_outbox(recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by)
  select membership.user_id, 'booking_cancelled', v_booking.id::text, 'push', 'ar', jsonb_build_object('booking_id', v_booking.id, 'booking_code', v_booking.booking_code, 'start_at', v_booking.start_at, 'clinic_id', v_booking.clinic_id), 'booking_cancelled:' || v_booking.id::text || ':' || membership.user_id::text || ':push:ar', 'pending', p_actor_id
  from public.clinic_memberships membership
  where membership.clinic_id = v_booking.clinic_id
    and membership.status = 'active'
    and membership.role in ('owner', 'manager', 'receptionist')
  on conflict (dedupe_key) do nothing;

  return 'patient_cancelled';
end;
$function$;

CREATE OR REPLACE FUNCTION public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    select e.event_type into v_latest_attendance from public.booking_attendance_events e where e.booking_id=p_booking_id order by e.sequence_no desc limit 1;
    if v_latest_attendance is distinct from 'checked_in' then raise exception 'booking requires an active check-in before completion' using errcode='55000'; end if;
  end if;

  update public.bookings set status=p_status where id=p_booking_id returning status into v_status;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values(p_actor_id,'booking.status_changed','booking',p_booking_id::text,jsonb_build_object('from',v_booking.status,'to',v_status,'branch_id',v_booking.branch_id));
  return v_status;
end;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_activity_report_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date, p_granularity text DEFAULT 'daily'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.clinic_booking_patient_details(p_booking_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(booking_id uuid, patient_display_name text, patient_relationship text, patient_national_id text, patient_nationality text, patient_date_of_birth date, patient_phone text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    b.id,
    pp.display_name,
    pp.relationship,
    pp.national_id,
    pp.nationality,
    pp.date_of_birth,
    pp.phone
  from public.bookings b
  join public.patient_profiles pp on pp.id = b.patient_profile_id
  where private.has_branch_access(b.branch_id, array['owner', 'manager', 'receptionist'])
    and (p_booking_ids is null or b.id = any(p_booking_ids));
$function$;

CREATE OR REPLACE FUNCTION public.complete_patient_phone_verification_server(p_actor_id uuid, p_challenge_id uuid, p_patient_profile_id uuid)
 RETURNS TABLE(profile_id uuid, verified_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_challenge record;
  v_profile_id uuid;
  v_verified_at timestamptz;
begin
  if p_actor_id is null or p_challenge_id is null or p_patient_profile_id is null then
    raise exception 'verified actor, challenge, and profile are required' using errcode = '22023';
  end if;

  select c.account_id, c.patient_profile_id, c.phone, c.status, c.consumed_at
  into v_challenge
  from public.patient_phone_verification_challenges c
  where c.id = p_challenge_id
  for update;

  if not found then
    raise exception 'verification challenge not found' using errcode = 'P0002';
  end if;

  if v_challenge.account_id <> p_actor_id or v_challenge.patient_profile_id <> p_patient_profile_id then
    raise exception 'verification challenge is not authorized for this profile' using errcode = '42501';
  end if;

  if v_challenge.status = 'verified' then
    select p.id, p.phone_verified_at
    into v_profile_id, v_verified_at
    from public.patient_profiles p
    where p.id = p_patient_profile_id
      and p.account_id = p_actor_id
      and p.phone = v_challenge.phone
      and p.archived_at is null;

    if not found or v_verified_at is null then
      raise exception 'verified challenge is inconsistent with patient profile' using errcode = '55000';
    end if;

    return query select v_profile_id, v_verified_at;
    return;
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'verification challenge is not pending' using errcode = '55000';
  end if;

  v_verified_at := now();

  update public.patient_profiles p
  set phone_verified_at = v_verified_at
  where p.id = p_patient_profile_id
    and p.account_id = p_actor_id
    and p.phone = v_challenge.phone
    and p.archived_at is null
  returning p.id into v_profile_id;

  if not found then
    raise exception 'patient profile no longer matches verification challenge' using errcode = '55000';
  end if;

  update public.patient_phone_verification_challenges c
  set status = 'verified', consumed_at = v_verified_at
  where c.id = p_challenge_id
    and c.account_id = p_actor_id
    and c.patient_profile_id = p_patient_profile_id
    and c.status = 'pending';

  if not found then
    raise exception 'verification challenge changed concurrently' using errcode = '40001';
  end if;

  return query select v_profile_id, v_verified_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit_server(p_scope text, p_subject_key text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_window_started_at timestamptz;
  v_consumed boolean;
begin
  if char_length(btrim(coalesce(p_scope, ''))) not between 3 and 80 then
    raise exception 'invalid rate-limit scope' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_subject_key, ''))) not between 3 and 160 then
    raise exception 'invalid rate-limit subject' using errcode = '22023';
  end if;
  if p_limit not between 1 and 1000 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate-limit configuration' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  delete from public.rate_limit_buckets
  where scope = p_scope
    and expires_at < now();

  insert into public.rate_limit_buckets(
    scope, subject_key, window_started_at, request_count, expires_at
  ) values (
    p_scope, p_subject_key, v_window_started_at, 1,
    v_window_started_at + make_interval(secs => p_window_seconds)
  )
  on conflict (scope, subject_key, window_started_at) do update
    set request_count = public.rate_limit_buckets.request_count + 1,
        updated_at = now()
    where public.rate_limit_buckets.request_count < p_limit
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_branch_application(p_clinic_id uuid, p_name text, p_area text DEFAULT NULL::text, p_address_line text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid:=gen_random_uuid(); v_location extensions.geography(Point,4326);
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if length(trim(coalesce(p_name,'')))<2 then raise exception 'branch name is required' using errcode='22023'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'lat/lng must be provided together' using errcode='22023'; end if;
  if p_lat is not null and (p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180) then raise exception 'invalid coordinates' using errcode='22023'; end if;
  if p_lat is not null then
    v_location:=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  end if;
  insert into public.branches(id,clinic_id,name,area,address_line,location,status)
  values(v_id,p_clinic_id,trim(p_name),nullif(trim(coalesce(p_area,'')),''),nullif(trim(coalesce(p_address_line,'')),''),v_location,'pending');
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_clinic_application(p_legal_name text, p_display_name text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.create_clinic_application_internal(p_legal_name,p_display_name);
$function$;

CREATE OR REPLACE FUNCTION public.create_settlement_period(p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  period_id uuid;
begin
  if not private.is_platform_admin() then raise exception 'platform admin required' using errcode = '42501'; end if;
  if p_period_kind not in ('weekly','monthly','annual','manual') then raise exception 'invalid period kind' using errcode = '22023'; end if;
  if p_period_end < p_period_start then raise exception 'invalid period interval' using errcode = '22023'; end if;
  if exists (
    select 1 from public.settlement_periods sp
    where sp.clinic_id=p_clinic_id and sp.status <> 'void'
      and daterange(sp.period_start,sp.period_end,'[]') && daterange(p_period_start,p_period_end,'[]')
  ) then raise exception 'settlement period overlaps an existing non-void period' using errcode = '23P01'; end if;
  insert into public.settlement_periods(clinic_id,period_start,period_end,period_kind,notes,created_by)
  values(p_clinic_id,p_period_start,p_period_end,p_period_kind,p_notes,auth.uid()) returning id into period_id;
  return period_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_settlement_period_server(p_actor_id uuid, p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare period_id uuid;
begin
  if not private.is_platform_admin_for_actor(p_actor_id) then raise exception 'platform admin required' using errcode='42501'; end if;
  if p_period_kind not in ('weekly','monthly','annual','manual') or p_period_end < p_period_start then raise exception 'invalid settlement period' using errcode='22023'; end if;
  if exists(select 1 from public.settlement_periods sp where sp.clinic_id=p_clinic_id and sp.status<>'void' and daterange(sp.period_start,sp.period_end,'[]') && daterange(p_period_start,p_period_end,'[]')) then raise exception 'settlement period overlaps an existing non-void period' using errcode='23P01'; end if;
  insert into public.settlement_periods(clinic_id,period_start,period_end,period_kind,notes,created_by) values(p_clinic_id,p_period_start,p_period_end,p_period_kind,p_notes,p_actor_id) returning id into period_id;
  return period_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_public_offer_price_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status = 'active' and not public.is_price_scope_publishable(new.price_scope) then
    raise exception using errcode = '23514', message = 'PRICE_SCOPE_CONFIRMATION_REQUIRED';
  end if;

  if public.is_price_scope_publishable(new.price_scope) then
    new.scope_confirmed_at := coalesce(new.scope_confirmed_at, now());
  else
    new.scope_confirmed_at := null;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.financial_report_summary(p_clinic_id uuid, p_start date, p_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.financial_report_summary_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_account_patient_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', 'patient') = 'clinic_operator' then
    return new;
  end if;

  insert into public.patient_profiles(account_id, display_name, relationship)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'أنا'),
    'self'
  )
  on conflict (account_id) where relationship = 'self' and archived_at is null do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_price_scope_publishable(p_scope jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    jsonb_typeof(p_scope) = 'object'
    and p_scope ?& array['registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications']
    and not exists (
      select 1
      from jsonb_each_text(p_scope) as item(key, value)
      where item.key in ('registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications')
        and item.value not in ('included', 'excluded', 'assessment_required', 'not_applicable')
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_valid_price_scope(p_scope jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    jsonb_typeof(p_scope) = 'object'
    and p_scope ?& array['registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications']
    and not exists (
      select 1
      from jsonb_each_text(p_scope) as item(key, value)
      where item.key in ('registration', 'examination', 'xray', 'diagnostics', 'anesthesia', 'laboratory', 'medications')
        and item.value not in ('included', 'excluded', 'assessment_required', 'not_applicable', 'not_confirmed')
    );
$function$;

CREATE OR REPLACE FUNCTION public.list_clinic_operator_accounts(p_clinic_id uuid)
 RETURNS TABLE(operator_account_id uuid, user_id uuid, username text, slot_no smallint, status text, created_at timestamp with time zone, revoked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null
    or not private.has_clinic_role_for_actor(auth.uid(), p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select operator.id, operator.user_id, username.username, operator.slot_no, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.account_usernames username on username.user_id = operator.user_id
  join public.clinic_memberships membership on membership.id = operator.membership_id
  where operator.clinic_id = p_clinic_id
  order by operator.slot_no, operator.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_clinic_operator_accounts_server(p_actor_id uuid, p_clinic_id uuid)
 RETURNS TABLE(operator_account_id uuid, user_id uuid, username text, slot_no smallint, status text, created_at timestamp with time zone, revoked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select operator.id, operator.user_id, account_username.username, operator.slot_no, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.account_usernames account_username on account_username.user_id = operator.user_id
  join public.clinic_memberships membership on membership.id = operator.membership_id
  where operator.clinic_id = p_clinic_id
  order by operator.slot_no, operator.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_operational_client_accounts_server(p_actor_id uuid)
 RETURNS TABLE(operator_account_id uuid, user_id uuid, username text, clinic_id uuid, clinic_name text, branch_id uuid, branch_name text, status text, created_at timestamp with time zone, revoked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select operator.id, operator.user_id, username_row.username, operator.clinic_id, clinic.display_name,
    membership.branch_id, branch.name, membership.status, operator.created_at, operator.revoked_at
  from public.clinic_operator_accounts operator
  join public.clinic_memberships membership on membership.id = operator.membership_id
  join public.account_usernames username_row on username_row.user_id = operator.user_id
  join public.clinics clinic on clinic.id = operator.clinic_id
  join public.branches branch on branch.id = membership.branch_id
  join auth.users auth_user on auth_user.id = operator.user_id
  where membership.role = 'receptionist'
    and auth_user.raw_app_meta_data ->> 'access_scope' = 'clinic_bookings_only'
  order by operator.revoked_at nulls first, operator.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.platform_activity_report_server(p_actor_id uuid, p_start date, p_end date, p_granularity text DEFAULT 'daily'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_actor_id is null or not private.is_platform_admin_for_actor(p_actor_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'INVALID_REPORT_INTERVAL' using errcode = '22023';
  end if;
  return private.activity_report_json(null, p_start, p_end, p_granularity);
end;
$function$;

CREATE OR REPLACE FUNCTION public.provision_clinic_operator_account(p_clinic_id uuid, p_user_id uuid, p_username text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.clinics where id = p_clinic_id for update;
  if not found then
    raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator'
  ) then
    raise exception 'INVALID_OPERATOR_ACCOUNT' using errcode = '22023';
  end if;

  select candidate.slot_no into v_slot
  from (values (1::smallint), (2::smallint)) as candidate(slot_no)
  where not exists (
    select 1
    from public.clinic_operator_accounts existing
    where existing.clinic_id = p_clinic_id
      and existing.slot_no = candidate.slot_no
      and existing.revoked_at is null
  )
  order by candidate.slot_no
  limit 1;

  if v_slot is null then
    raise exception 'CLINIC_OPERATOR_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.account_usernames(user_id, username)
  values (p_user_id, p_username);

  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (p_user_id, p_clinic_id, null, 'manager', 'active')
  returning id into v_membership_id;

  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, v_actor_id)
  returning id into v_operator_account_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, v_actor_id, 'created');

  return v_operator_account_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.provision_clinic_operator_account_server(p_actor_id uuid, p_clinic_id uuid, p_user_id uuid, p_username text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, p_clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.clinics where id = p_clinic_id for update;
  if not found then raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002'; end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator') then
    raise exception 'INVALID_OPERATOR_ACCOUNT' using errcode = '22023';
  end if;

  select candidate.slot_no into v_slot
  from (values (1::smallint), (2::smallint)) as candidate(slot_no)
  where not exists (
    select 1 from public.clinic_operator_accounts existing
    where existing.clinic_id = p_clinic_id and existing.slot_no = candidate.slot_no and existing.revoked_at is null
  )
  order by candidate.slot_no limit 1;
  if v_slot is null then raise exception 'CLINIC_OPERATOR_LIMIT_REACHED' using errcode = 'P0001'; end if;

  insert into public.account_usernames(user_id, username) values (p_user_id, p_username);
  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (p_user_id, p_clinic_id, null, 'manager', 'active') returning id into v_membership_id;
  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, p_actor_id) returning id into v_operator_account_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, p_actor_id, 'created');
  return v_operator_account_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.provision_operational_client_account_server(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_user_id uuid, p_username text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_slot smallint;
  v_membership_id uuid;
  v_operator_account_id uuid;
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'CLINIC_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id and clinic_id = p_clinic_id) then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and u.raw_user_meta_data ->> 'account_kind' = 'clinic_operator'
      and u.raw_app_meta_data ->> 'access_scope' = 'clinic_bookings_only'
  ) then
    raise exception 'INVALID_OPERATIONAL_CLIENT' using errcode = '22023';
  end if;

  select candidate.slot_no into v_slot
  from (values (1::smallint), (2::smallint)) as candidate(slot_no)
  where not exists (
    select 1
    from public.clinic_operator_accounts existing
    where existing.clinic_id = p_clinic_id
      and existing.slot_no = candidate.slot_no
      and existing.revoked_at is null
  )
  order by candidate.slot_no
  limit 1;
  if v_slot is null then
    raise exception 'CLINIC_OPERATOR_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.account_usernames(user_id, username)
  values (p_user_id, p_username);

  insert into public.clinic_memberships(user_id, clinic_id, branch_id, role, status)
  values (p_user_id, p_clinic_id, p_branch_id, 'receptionist', 'active')
  returning id into v_membership_id;

  insert into public.clinic_operator_accounts(clinic_id, user_id, membership_id, slot_no, created_by)
  values (p_clinic_id, p_user_id, v_membership_id, v_slot, p_actor_id)
  returning id into v_operator_account_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (p_clinic_id, v_operator_account_id, p_user_id, p_actor_id, 'created');

  return v_operator_account_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_check_in(p_booking_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
  next_sequence integer;
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
  order by e.sequence_no desc
  limit 1;
  if target_booking.status='checked_in' and latest_event_type='checked_in' then return event_id; end if;

  if target_booking.status='confirmed' then update public.bookings set status='checked_in' where id=p_booking_id; end if;
  select coalesce(max(e.sequence_no),0)+1 into next_sequence from public.booking_attendance_events e where e.booking_id=p_booking_id;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id,sequence_no)
  values(p_booking_id,'checked_in',p_reason,auth.uid(),'clinic_ui','checkin:'||gen_random_uuid()::text,next_sequence)
  returning id into event_id;
  return event_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
  next_sequence integer;
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
  order by e.sequence_no desc
  limit 1;

  if target_booking.status='checked_in' and latest_event_type='checked_in' then return event_id; end if;
  if target_booking.status='confirmed' then update public.bookings set status='checked_in' where id=p_booking_id; end if;

  select coalesce(max(e.sequence_no),0)+1 into next_sequence from public.booking_attendance_events e where e.booking_id=p_booking_id;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id,sequence_no)
  values(p_booking_id,'checked_in',p_reason,p_actor_id,'clinic_ui','checkin:'||gen_random_uuid()::text,next_sequence)
  returning id into event_id;
  return event_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_device_installation_guarded_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text, p_client_subject_key text, p_installation_subject_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_allowed boolean;
begin
  if p_client_subject_key is null or p_client_subject_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid client rate-limit subject' using errcode = '22023';
  end if;

  if p_installation_subject_key is null or p_installation_subject_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid installation rate-limit subject' using errcode = '22023';
  end if;

  v_allowed := public.consume_rate_limit_server(
    'device_installation',
    p_client_subject_key,
    20,
    60
  );
  if not v_allowed then
    return 'client_rate_limited';
  end if;

  v_allowed := public.consume_rate_limit_server(
    'device_installation',
    p_installation_subject_key,
    60,
    3600
  );
  if not v_allowed then
    return 'installation_rate_limited';
  end if;

  perform public.register_device_installation_server(
    p_account_id,
    p_installation_id,
    p_device_label,
    p_platform,
    p_browser,
    p_device_class,
    p_app_version
  );

  return 'ok';
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_device_installation_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  if p_installation_id is null then
    raise exception 'installation id required' using errcode = '22023';
  end if;

  if p_device_class not in ('mobile', 'tablet', 'desktop', 'unknown') then
    raise exception 'invalid device class' using errcode = '22023';
  end if;

  insert into public.device_installations(
    installation_id,
    account_id,
    device_label,
    platform,
    browser,
    device_class,
    app_version,
    first_seen_at,
    last_seen_at
  )
  values (
    p_installation_id,
    p_account_id,
    nullif(btrim(coalesce(p_device_label, '')), ''),
    nullif(btrim(coalesce(p_platform, '')), ''),
    nullif(btrim(coalesce(p_browser, '')), ''),
    p_device_class,
    nullif(btrim(coalesce(p_app_version, '')), ''),
    now(),
    now()
  )
  on conflict (installation_id) do update
  set
    account_id = coalesce(excluded.account_id, device_installations.account_id),
    device_label = coalesce(excluded.device_label, device_installations.device_label),
    platform = coalesce(excluded.platform, device_installations.platform),
    browser = coalesce(excluded.browser, device_installations.browser),
    device_class = excluded.device_class,
    app_version = coalesce(excluded.app_version, device_installations.app_version),
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_offer_revision(p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare current_offer public.branch_service_offers%rowtype; next_revision integer; revision_id uuid; proposed jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_price_type not in ('fixed','from','range','package','consultation_required') or p_duration_minutes not between 5 and 480 then raise exception 'invalid offer values' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a revision reason is required' using errcode = '22023'; end if;
  select o.* into current_offer from public.branch_service_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer not found' using errcode='P0002'; end if;
  if not private.has_clinic_role((select b.clinic_id from public.branches b where b.id=current_offer.branch_id),current_offer.branch_id,array['owner','manager','pricing_manager']) then raise exception 'not authorized for this offer' using errcode='42501'; end if;
  if p_price_type = 'consultation_required' and (p_min_minor is not null or p_max_minor is not null) then raise exception 'consultation-required price cannot carry amounts' using errcode='22023'; end if;
  if p_price_type = 'fixed' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is null or p_max_minor <> p_min_minor) then raise exception 'fixed price requires equal non-negative minimum and maximum' using errcode='22023'; end if;
  if p_price_type = 'range' and (p_min_minor is null or p_max_minor is null or p_min_minor < 0 or p_max_minor < p_min_minor) then raise exception 'invalid price range' using errcode='22023'; end if;
  if p_price_type = 'from' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'from price requires one non-negative minimum' using errcode='22023'; end if;
  if p_price_type = 'package' and (p_min_minor is null or p_min_minor < 0 or (p_max_minor is not null and p_max_minor < p_min_minor)) then raise exception 'invalid package price' using errcode='22023'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.offer_revisions where offer_id=p_offer_id;
  proposed:=jsonb_build_object('price_type',p_price_type,'min_minor',p_min_minor,'max_minor',p_max_minor,'duration_minutes',p_duration_minutes);
  insert into public.offer_revisions(offer_id,revision_no,previous_snapshot,proposed_snapshot,reason,status,requested_by)
  values(p_offer_id,next_revision,to_jsonb(current_offer),proposed,p_reason,'submitted',auth.uid()) returning id into revision_id;
  return revision_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_offer_revision_server(p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare current_offer public.branch_service_offers%rowtype; next_revision integer; revision_id uuid; proposed jsonb;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode = '28000'; end if;
  if p_price_type not in ('fixed','from','range','package','consultation_required') or p_duration_minutes not between 5 and 480 then raise exception 'invalid offer values' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a revision reason is required' using errcode = '22023'; end if;
  select o.* into current_offer from public.branch_service_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,(select b.clinic_id from public.branches b where b.id=current_offer.branch_id),current_offer.branch_id,array['owner','manager','pricing_manager']) then raise exception 'not authorized for this offer' using errcode='42501'; end if;
  if p_price_type = 'consultation_required' and (p_min_minor is not null or p_max_minor is not null) then raise exception 'consultation-required price cannot carry amounts' using errcode='22023'; end if;
  if p_price_type = 'fixed' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is null or p_max_minor <> p_min_minor) then raise exception 'fixed price requires equal non-negative minimum and maximum' using errcode='22023'; end if;
  if p_price_type = 'range' and (p_min_minor is null or p_max_minor is null or p_min_minor < 0 or p_max_minor < p_min_minor) then raise exception 'invalid price range' using errcode='22023'; end if;
  if p_price_type = 'from' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'from price requires one non-negative minimum' using errcode='22023'; end if;
  if p_price_type = 'package' and (p_min_minor is null or p_min_minor < 0 or (p_max_minor is not null and p_max_minor < p_min_minor)) then raise exception 'invalid package price' using errcode='22023'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.offer_revisions where offer_id=p_offer_id;
  proposed:=jsonb_build_object('price_type',p_price_type,'min_minor',p_min_minor,'max_minor',p_max_minor,'duration_minutes',p_duration_minutes);
  insert into public.offer_revisions(offer_id,revision_no,previous_snapshot,proposed_snapshot,reason,status,requested_by)
  values(p_offer_id,next_revision,to_jsonb(current_offer),proposed,p_reason,'submitted',p_actor_id) returning id into revision_id;
  return revision_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_booking_attendance(p_booking_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
  next_sequence integer;
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
  order by e.sequence_no desc
  limit 1;
  if latest_event_type is distinct from 'checked_in' then raise exception 'booking has no active check-in to reverse' using errcode='55000'; end if;

  select coalesce(max(e.sequence_no),0)+1 into next_sequence from public.booking_attendance_events e where e.booking_id=p_booking_id;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id,sequence_no)
  values(p_booking_id,'attendance_reversed',p_reason,auth.uid(),case when private.is_platform_admin() then 'admin_ui' else 'clinic_ui' end,'reversal:'||gen_random_uuid()::text,next_sequence)
  returning id into event_id;
  update public.bookings set status='confirmed' where id=p_booking_id;
  return event_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_booking public.bookings%rowtype;
  event_id uuid;
  latest_event_type text;
  next_sequence integer;
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
  order by e.sequence_no desc
  limit 1;
  if latest_event_type is distinct from 'checked_in' then raise exception 'booking has no active check-in to reverse' using errcode='55000'; end if;

  select coalesce(max(e.sequence_no),0)+1 into next_sequence from public.booking_attendance_events e where e.booking_id=p_booking_id;
  insert into public.booking_attendance_events(booking_id,event_type,reason,recorded_by,source_type,source_id,sequence_no)
  values(p_booking_id,'attendance_reversed',p_reason,p_actor_id,case when private.is_platform_admin_for_actor(p_actor_id) then 'admin_ui' else 'clinic_ui' end,'reversal:'||gen_random_uuid()::text,next_sequence)
  returning id into event_id;
  update public.bookings set status='confirmed' where id=p_booking_id;
  return event_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_offer_revision(p_revision_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  revision public.offer_revisions%rowtype;
  approved_offer uuid;
begin
  if not private.is_platform_admin() then raise exception 'platform admin required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason,''))) > 500 then raise exception 'review reason too long' using errcode = '22023'; end if;
  select * into revision from public.offer_revisions where id = p_revision_id for update;
  if not found then raise exception 'offer revision not found' using errcode = 'P0002'; end if;
  if revision.status <> 'submitted' then raise exception 'only submitted revisions can be reviewed' using errcode = '55000'; end if;

  if p_approve then
    update public.branch_service_offers
       set price_type = revision.proposed_snapshot ->> 'price_type',
           min_minor = nullif(revision.proposed_snapshot ->> 'min_minor','')::integer,
           max_minor = nullif(revision.proposed_snapshot ->> 'max_minor','')::integer,
           duration_minutes = (revision.proposed_snapshot ->> 'duration_minutes')::integer,
           status = 'active',
           clinic_attested_at = now(),
           updated_at = now()
     where id = revision.offer_id
     returning id into approved_offer;
    update public.offer_revisions
       set status='approved', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
     where id=p_revision_id;
  else
    update public.offer_revisions
       set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now(),
           proposed_snapshot = proposed_snapshot || jsonb_build_object('review_reason',coalesce(p_reason,''))
     where id=p_revision_id;
    approved_offer := revision.offer_id;
  end if;
  return approved_offer;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_offer_revision_server(p_actor_id uuid, p_revision_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.revoke_clinic_operator_account(p_operator_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator
  from public.clinic_operator_accounts
  where id = p_operator_account_id
    and revoked_at is null
  for update;

  if not found then
    raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_actor_id is null
    or not private.has_clinic_role_for_actor(v_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.clinic_operator_accounts
  set revoked_at = now()
  where id = v_operator.id;

  update public.clinic_memberships
  set status = 'revoked'
  where id = v_operator.membership_id;

  update public.account_usernames
  set disabled_at = now()
  where user_id = v_operator.user_id;

  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, v_actor_id, 'revoked');
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_clinic_operator_account_server(p_actor_id uuid, p_operator_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator public.clinic_operator_accounts%rowtype;
begin
  select * into v_operator from public.clinic_operator_accounts where id = p_operator_account_id and revoked_at is null for update;
  if not found then raise exception 'OPERATOR_ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_actor_id is null or not private.has_clinic_role_for_actor(p_actor_id, v_operator.clinic_id, null, array['owner']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.clinic_operator_accounts set revoked_at = now() where id = v_operator.id;
  update public.clinic_memberships set status = 'revoked' where id = v_operator.membership_id;
  update public.account_usernames set disabled_at = now() where user_id = v_operator.user_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'revoked');
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_operational_client_account_server(p_actor_id uuid, p_operator_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_operator public.clinic_operator_accounts%rowtype;
  v_role text;
begin
  if p_actor_id is null or not private.is_platform_super_admin_for_actor(p_actor_id) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select operator.* into v_operator
  from public.clinic_operator_accounts operator
  where operator.id = p_operator_account_id and operator.revoked_at is null
  for update;
  if not found then
    raise exception 'OPERATIONAL_CLIENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select role into v_role from public.clinic_memberships where id = v_operator.membership_id for update;
  if v_role is distinct from 'receptionist' then
    raise exception 'INVALID_OPERATIONAL_CLIENT' using errcode = '22023';
  end if;

  update public.clinic_operator_accounts set revoked_at = now() where id = v_operator.id;
  update public.clinic_memberships set status = 'revoked' where id = v_operator.membership_id;
  update public.account_usernames set disabled_at = now() where user_id = v_operator.user_id;
  insert into public.clinic_operator_account_events(clinic_id, operator_account_id, operator_user_id, actor_user_id, event_type)
  values (v_operator.clinic_id, v_operator.id, v_operator.user_id, p_actor_id, 'revoked');
end;
$function$;

CREATE OR REPLACE FUNCTION public.search_dental_offers(p_variant_id uuid, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_km double precision DEFAULT 10)
 RETURNS TABLE(offer_id uuid, clinic_id uuid, clinic_name text, branch_id uuid, branch_name text, area text, branch_latitude double precision, branch_longitude double precision, variant_id uuid, price_type text, min_minor integer, max_minor integer, currency character, price_scope jsonb, included_items jsonb, excluded_items jsonb, materials jsonb, visit_count integer, follow_up_terms text, scope_confirmed_at timestamp with time zone, duration_minutes integer, clinic_attested_at timestamp with time zone, last_verified_at timestamp with time zone, distance_km double precision, open_now boolean, earliest_slot_id uuid, earliest_slot_at timestamp with time zone, rating_avg numeric, review_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    o.id,
    c.id,
    c.display_name,
    b.id,
    b.name,
    b.area,
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
    select s.id, s.start_at
    from public.availability_slots s
    where s.branch_id = b.id
      and s.variant_id = o.variant_id
      and s.status = 'published'
      and s.start_at > now()
      and (s.expires_at is null or s.expires_at > now())
      and extract(epoch from (s.end_at - s.start_at)) / 60.0 >= o.duration_minutes
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_and_activate_server(p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_source text, p_identifier text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_rows integer := 0;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_actor_id
      and coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
  ) then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  if p_subject_type not in ('clinic', 'branch', 'practitioner') then
    raise exception 'unsupported verification subject' using errcode = '22023';
  end if;

  if nullif(btrim(p_source), '') is null then
    raise exception 'verification source required' using errcode = '22023';
  end if;

  insert into public.verification_records(
    subject_type,
    subject_id,
    source,
    identifier,
    status,
    verified_at,
    created_by
  )
  values (
    p_subject_type,
    p_subject_id,
    btrim(p_source),
    nullif(btrim(coalesce(p_identifier, '')), ''),
    'verified',
    now(),
    p_actor_id
  );

  if p_subject_type = 'clinic' then
    update public.clinics set status = 'active' where id = p_subject_id;
  elsif p_subject_type = 'branch' then
    update public.branches set status = 'active' where id = p_subject_id;
  else
    update public.practitioners set active = true where id = p_subject_id;
  end if;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'verification target not found' using errcode = 'P0002';
  end if;
end;
$function$;

-- END asnani-production-functions-ddl

-- BEGIN asnani-production-constraints-ddl

alter table public.account_usernames add constraint account_usernames_pkey PRIMARY KEY (user_id);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_pkey PRIMARY KEY (id);

alter table public.accounting_journals add constraint accounting_journals_pkey PRIMARY KEY (id);

alter table public.audit_events add constraint audit_events_pkey PRIMARY KEY (id);

alter table public.availability_slots add constraint availability_slots_pkey PRIMARY KEY (id);

alter table public.booking_attendance_events add constraint booking_attendance_events_pkey PRIMARY KEY (id);

alter table public.booking_status_history add constraint booking_status_history_pkey PRIMARY KEY (id);

alter table public.bookings add constraint bookings_pkey PRIMARY KEY (id);

alter table public.branch_hour_exceptions add constraint branch_hour_exceptions_pkey PRIMARY KEY (id);

alter table public.branch_hours add constraint branch_hours_pkey PRIMARY KEY (id);

alter table public.branch_service_offers add constraint branch_service_offers_pkey PRIMARY KEY (id);

alter table public.branches add constraint branches_pkey PRIMARY KEY (id);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_pkey PRIMARY KEY (id);

alter table public.clinic_memberships add constraint clinic_memberships_pkey PRIMARY KEY (id);

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_pkey PRIMARY KEY (id);

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_pkey PRIMARY KEY (id);

alter table public.clinics add constraint clinics_pkey PRIMARY KEY (id);

alter table public.consent_records add constraint consent_records_pkey PRIMARY KEY (id);

alter table public.customer_choice_events add constraint customer_choice_events_pkey PRIMARY KEY (id);

alter table public.device_installations add constraint device_installations_pkey PRIMARY KEY (id);

alter table public.feature_flags add constraint feature_flags_pkey PRIMARY KEY (key);

alter table public.idempotency_keys add constraint idempotency_keys_pkey PRIMARY KEY (id);

alter table public.instant_slots add constraint instant_slots_pkey PRIMARY KEY (id);

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_pkey PRIMARY KEY (id);

alter table public.notification_outbox add constraint notification_outbox_pkey PRIMARY KEY (id);

alter table public.notification_preferences add constraint notification_preferences_pkey PRIMARY KEY (id);

alter table public.notification_subscriptions add constraint notification_subscriptions_pkey PRIMARY KEY (id);

alter table public.notification_templates add constraint notification_templates_pkey PRIMARY KEY (id);

alter table public.offer_revisions add constraint offer_revisions_pkey PRIMARY KEY (id);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_pkey PRIMARY KEY (id);

alter table public.patient_profiles add constraint patient_profiles_pkey PRIMARY KEY (id);

alter table public.payment_events add constraint payment_events_pkey PRIMARY KEY (id);

alter table public.payment_intents add constraint payment_intents_pkey PRIMARY KEY (id);

alter table public.practitioners add constraint practitioners_pkey PRIMARY KEY (id);

alter table public.price_disputes add constraint price_disputes_pkey PRIMARY KEY (id);

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table public.rate_limit_buckets add constraint rate_limit_buckets_pkey PRIMARY KEY (scope, subject_key, window_started_at);

alter table public.reconciliation_exceptions add constraint reconciliation_exceptions_pkey PRIMARY KEY (id);

alter table public.report_exports add constraint report_exports_pkey PRIMARY KEY (id);

alter table public.resources add constraint resources_pkey PRIMARY KEY (id);

alter table public.reviews add constraint reviews_pkey PRIMARY KEY (id);

alter table public.settlement_periods add constraint settlement_periods_pkey PRIMARY KEY (id);

alter table public.support_conversations add constraint support_conversations_pkey PRIMARY KEY (id);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_pkey PRIMARY KEY (id);

alter table public.support_messages add constraint support_messages_pkey PRIMARY KEY (id);

alter table public.suspensions add constraint suspensions_pkey PRIMARY KEY (id);

alter table public.treatment_catalog add constraint treatment_catalog_pkey PRIMARY KEY (id);

alter table public.treatment_variants add constraint treatment_variants_pkey PRIMARY KEY (id);

alter table public.verification_records add constraint verification_records_pkey PRIMARY KEY (id);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_journal_id_line_no_key UNIQUE (journal_id, line_no);

alter table public.accounting_journals add constraint accounting_journals_source_type_source_id_journal_type_key UNIQUE (source_type, source_id, journal_type);

alter table public.booking_attendance_events add constraint booking_attendance_events_booking_id_event_type_source_type_key UNIQUE (booking_id, event_type, source_type, source_id);

alter table public.bookings add constraint bookings_booking_code_key UNIQUE (booking_code);

alter table public.bookings add constraint bookings_patient_id_idempotency_key_key UNIQUE (patient_id, idempotency_key);

alter table public.branch_hour_exceptions add constraint branch_hour_exceptions_branch_id_local_date_key UNIQUE (branch_id, local_date);

alter table public.branch_hours add constraint branch_hours_branch_id_weekday_key UNIQUE (branch_id, weekday);

alter table public.branches add constraint branches_id_clinic_id_key UNIQUE (id, clinic_id);

alter table public.customer_choice_events add constraint customer_choice_events_event_id_key UNIQUE (event_id);

alter table public.device_installations add constraint device_installations_installation_id_key UNIQUE (installation_id);

alter table public.idempotency_keys add constraint idempotency_keys_scope_user_id_key_key UNIQUE (scope, user_id, key);

alter table public.instant_slots add constraint instant_slots_slot_id_key UNIQUE (slot_id);

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_outbox_id_attempt_no_key UNIQUE (outbox_id, attempt_no);

alter table public.notification_outbox add constraint notification_outbox_dedupe_key_key UNIQUE (dedupe_key);

alter table public.notification_preferences add constraint notification_preferences_user_id_channel_purpose_key UNIQUE (user_id, channel, purpose);

alter table public.notification_subscriptions add constraint notification_subscriptions_user_id_channel_endpoint_key UNIQUE (user_id, channel, endpoint);

alter table public.notification_templates add constraint notification_templates_template_key_channel_locale_version_key UNIQUE (template_key, channel, locale, version);

alter table public.offer_revisions add constraint offer_revisions_offer_id_revision_no_key UNIQUE (offer_id, revision_no);

alter table public.payment_events add constraint payment_events_provider_event_id_key UNIQUE (provider_event_id);

alter table public.reviews add constraint reviews_booking_id_key UNIQUE (booking_id);

alter table public.settlement_periods add constraint settlement_periods_clinic_id_period_start_period_end_period_key UNIQUE (clinic_id, period_start, period_end, period_kind);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_slug_locale_version_key UNIQUE (slug, locale, version);

alter table public.treatment_catalog add constraint treatment_catalog_code_key UNIQUE (code);

alter table public.treatment_variants add constraint treatment_variants_catalog_id_variant_key_key UNIQUE (catalog_id, variant_key);

alter table public.account_usernames add constraint account_usernames_format_check CHECK (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$'::text);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_account_code_check CHECK (account_code = ANY (ARRAY['clinic_payable'::text, 'platform_fee_revenue'::text, 'adjustment_clearing'::text]));

alter table public.accounting_journal_lines add constraint accounting_journal_lines_check CHECK (debit_minor > 0 AND credit_minor = 0 OR credit_minor > 0 AND debit_minor = 0);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_credit_minor_check CHECK (credit_minor >= 0);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_debit_minor_check CHECK (debit_minor >= 0);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_line_no_check CHECK (line_no > 0);

alter table public.accounting_journal_lines add constraint accounting_journal_lines_memo_check CHECK (memo IS NULL OR char_length(memo) <= 500);

alter table public.accounting_journals add constraint accounting_journals_check CHECK (status <> 'posted'::text OR posted_by IS NOT NULL AND posted_at IS NOT NULL);

alter table public.accounting_journals add constraint accounting_journals_currency_check CHECK (currency = 'QAR'::bpchar);

alter table public.accounting_journals add constraint accounting_journals_description_check CHECK (char_length(TRIM(BOTH FROM description)) >= 3 AND char_length(TRIM(BOTH FROM description)) <= 500);

alter table public.accounting_journals add constraint accounting_journals_journal_type_check CHECK (journal_type = ANY (ARRAY['platform_fee_accrual'::text, 'platform_fee_reversal'::text, 'manual_adjustment'::text]));

alter table public.accounting_journals add constraint accounting_journals_source_type_check CHECK (source_type = ANY (ARRAY['attendance'::text, 'attendance_reversal'::text, 'manual_adjustment'::text, 'period_correction'::text]));

alter table public.accounting_journals add constraint accounting_journals_status_check CHECK (status = ANY (ARRAY['draft'::text, 'posted'::text, 'reversed'::text, 'void'::text]));

alter table public.availability_slots add constraint availability_slots_check CHECK (end_at > start_at);

alter table public.availability_slots add constraint availability_slots_check1 CHECK (expires_at IS NULL OR expires_at > created_at);

alter table public.availability_slots add constraint availability_slots_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'held'::text, 'consumed'::text, 'expired'::text, 'cancelled'::text]));

alter table public.booking_attendance_events add constraint booking_attendance_events_event_type_check CHECK (event_type = ANY (ARRAY['checked_in'::text, 'attendance_reversed'::text]));

alter table public.booking_attendance_events add constraint booking_attendance_events_reason_check CHECK (reason IS NULL OR char_length(TRIM(BOTH FROM reason)) >= 3 AND char_length(TRIM(BOTH FROM reason)) <= 500);

alter table public.booking_attendance_events add constraint booking_attendance_events_sequence_no_check CHECK (sequence_no > 0);

alter table public.booking_attendance_events add constraint booking_attendance_events_source_type_check CHECK (source_type = ANY (ARRAY['clinic_ui'::text, 'admin_ui'::text, 'api'::text]));

alter table public.bookings add constraint bookings_check CHECK (end_at > start_at);

alter table public.bookings add constraint bookings_status_check CHECK (status = ANY (ARRAY['pending_hold'::text, 'pending_clinic_confirmation'::text, 'confirmed'::text, 'checked_in'::text, 'completed'::text, 'patient_cancelled'::text, 'clinic_cancelled'::text, 'no_show'::text, 'expired'::text, 'failed'::text]));

alter table public.branch_hour_exceptions add constraint branch_hour_exceptions_check CHECK (is_closed AND open_time IS NULL AND close_time IS NULL OR NOT is_closed AND open_time IS NOT NULL AND close_time IS NOT NULL);

alter table public.branch_hours add constraint branch_hours_check CHECK (is_closed AND open_time IS NULL AND close_time IS NULL OR NOT is_closed AND open_time IS NOT NULL AND close_time IS NOT NULL);

alter table public.branch_hours add constraint branch_hours_weekday_check CHECK (weekday >= 0 AND weekday <= 6);

alter table public.branch_service_offers add constraint branch_service_offers_check CHECK (effective_to IS NULL OR effective_to > effective_from);

alter table public.branch_service_offers add constraint branch_service_offers_check1 CHECK (price_type = 'fixed'::text AND min_minor IS NOT NULL AND max_minor = min_minor AND min_minor >= 0 OR price_type = 'from'::text AND min_minor IS NOT NULL AND max_minor IS NULL AND min_minor >= 0 OR price_type = 'range'::text AND min_minor IS NOT NULL AND max_minor IS NOT NULL AND min_minor >= 0 AND max_minor >= min_minor OR price_type = 'package'::text AND min_minor IS NOT NULL AND min_minor >= 0 AND (max_minor IS NULL OR max_minor >= min_minor) OR price_type = 'consultation_required'::text AND min_minor IS NULL AND max_minor IS NULL);

alter table public.branch_service_offers add constraint branch_service_offers_currency_check CHECK (currency = 'QAR'::bpchar);

alter table public.branch_service_offers add constraint branch_service_offers_duration_minutes_check CHECK (duration_minutes >= 5 AND duration_minutes <= 480);

alter table public.branch_service_offers add constraint branch_service_offers_price_scope_shape_check CHECK (is_valid_price_scope(price_scope));

alter table public.branch_service_offers add constraint branch_service_offers_price_type_check CHECK (price_type = ANY (ARRAY['fixed'::text, 'from'::text, 'range'::text, 'package'::text, 'consultation_required'::text]));

alter table public.branch_service_offers add constraint branch_service_offers_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'needs_review'::text, 'stale'::text, 'suspended'::text, 'archived'::text]));

alter table public.branch_service_offers add constraint branch_service_offers_visit_count_check CHECK (visit_count IS NULL OR visit_count > 0);

alter table public.branches add constraint branches_status_check CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'archived'::text]));

alter table public.clinic_fee_rules add constraint clinic_fee_rules_check CHECK (fee_type = 'per_attended_booking'::text AND fixed_minor IS NOT NULL AND rate_bps IS NULL OR fee_type = 'percentage_of_offer_snapshot'::text AND rate_bps IS NOT NULL AND fixed_minor IS NULL);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_check1 CHECK (effective_to IS NULL OR effective_to > effective_from);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_currency_check CHECK (currency = 'QAR'::bpchar);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_fee_type_check CHECK (fee_type = ANY (ARRAY['per_attended_booking'::text, 'percentage_of_offer_snapshot'::text]));

alter table public.clinic_fee_rules add constraint clinic_fee_rules_fixed_minor_check CHECK (fixed_minor IS NULL OR fixed_minor >= 0);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_rate_bps_check CHECK (rate_bps IS NULL OR rate_bps >= 0 AND rate_bps <= 10000);

alter table public.clinic_fee_rules add constraint clinic_fee_rules_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]));

alter table public.clinic_memberships add constraint clinic_memberships_role_check CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'receptionist'::text, 'pricing_manager'::text, 'viewer'::text]));

alter table public.clinic_memberships add constraint clinic_memberships_status_check CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'revoked'::text]));

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_event_type_check CHECK (event_type = ANY (ARRAY['created'::text, 'password_reset'::text, 'revoked'::text]));

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_slot_no_check CHECK (slot_no = ANY (ARRAY[1, 2]));

alter table public.clinics add constraint clinics_status_check CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'rejected'::text, 'archived'::text]));

alter table public.consent_records add constraint consent_records_action_check CHECK (action = ANY (ARRAY['granted'::text, 'withdrawn'::text]));

alter table public.customer_choice_events add constraint customer_choice_events_booking_payload_contract CHECK ((event_name <> ALL (ARRAY['offer_booking_clicked'::text, 'booking_login_required'::text, 'booking_succeeded'::text, 'booking_failed'::text])) OR offer_id IS NOT NULL AND slot_id IS NOT NULL);

alter table public.customer_choice_events add constraint customer_choice_events_choice_value_check CHECK (jsonb_typeof(choice_value) = 'object'::text AND pg_column_size(choice_value) <= 4096);

alter table public.customer_choice_events add constraint customer_choice_events_event_name_check CHECK (event_name = ANY (ARRAY['treatment_selected'::text, 'variant_selected'::text, 'appointment_preference_selected'::text, 'location_requested'::text, 'location_acquired'::text, 'location_denied'::text, 'search_submitted'::text, 'offer_booking_clicked'::text, 'booking_login_required'::text, 'booking_succeeded'::text, 'booking_failed'::text]));

alter table public.customer_choice_events add constraint customer_choice_events_page_path_check CHECK (char_length(page_path) >= 1 AND char_length(page_path) <= 300);

alter table public.customer_choice_events add constraint customer_choice_events_search_payload_contract CHECK (event_name <> 'search_submitted'::text OR treatment_id IS NOT NULL AND variant_id IS NOT NULL AND COALESCE((choice_value ->> 'when'::text) = ANY (ARRAY['earliest'::text, 'today'::text, 'tomorrow'::text]), false) AND COALESCE((choice_value ->> 'location_used'::text) = ANY (ARRAY['true'::text, 'false'::text]), false));

alter table public.customer_choice_events add constraint customer_choice_events_selection_payload_contract CHECK ((event_name <> 'treatment_selected'::text OR treatment_id IS NOT NULL) AND (event_name <> 'variant_selected'::text OR treatment_id IS NOT NULL AND variant_id IS NOT NULL) AND (event_name <> 'appointment_preference_selected'::text OR treatment_id IS NOT NULL AND variant_id IS NOT NULL AND COALESCE((choice_value ->> 'when'::text) = ANY (ARRAY['earliest'::text, 'today'::text, 'tomorrow'::text]), false)));

alter table public.device_installations add constraint device_installations_browser_check CHECK (browser IS NULL OR char_length(btrim(browser)) <= 120);

alter table public.device_installations add constraint device_installations_class_check CHECK (device_class IS NULL OR (device_class = ANY (ARRAY['mobile'::text, 'tablet'::text, 'desktop'::text, 'unknown'::text])));

alter table public.device_installations add constraint device_installations_label_check CHECK (device_label IS NULL OR char_length(btrim(device_label)) >= 1 AND char_length(btrim(device_label)) <= 80);

alter table public.device_installations add constraint device_installations_platform_check CHECK (platform IS NULL OR char_length(btrim(platform)) <= 80);

alter table public.device_installations add constraint device_installations_version_check CHECK (app_version IS NULL OR char_length(btrim(app_version)) <= 80);

alter table public.instant_slots add constraint instant_slots_check CHECK (expires_at > publish_at);

alter table public.instant_slots add constraint instant_slots_check1 CHECK (arrival_deadline >= publish_at);

alter table public.instant_slots add constraint instant_slots_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'consumed'::text, 'expired'::text, 'cancelled'::text]));

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_attempt_no_check CHECK (attempt_no > 0 AND attempt_no <= 10);

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_error_detail_check CHECK (error_detail IS NULL OR char_length(error_detail) <= 1000);

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_status_check CHECK (status = ANY (ARRAY['accepted'::text, 'delivered'::text, 'failed'::text, 'rejected'::text, 'suppressed'::text]));

alter table public.notification_outbox add constraint notification_outbox_attempt_count_check CHECK (attempt_count >= 0 AND attempt_count <= 10);

alter table public.notification_outbox add constraint notification_outbox_channel_check CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text]));

alter table public.notification_outbox add constraint notification_outbox_dedupe_key_check CHECK (char_length(dedupe_key) >= 12 AND char_length(dedupe_key) <= 160);

alter table public.notification_outbox add constraint notification_outbox_event_type_check CHECK (event_type = ANY (ARRAY['booking_requested'::text, 'booking_confirmed'::text, 'booking_cancelled'::text, 'booking_updated'::text, 'attendance_recorded'::text, 'price_updated'::text, 'support_reply'::text, 'manual'::text]));

alter table public.notification_outbox add constraint notification_outbox_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text]));

alter table public.notification_outbox add constraint notification_outbox_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'suppressed'::text, 'dead_letter'::text]));

alter table public.notification_preferences add constraint notification_preferences_channel_check CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text]));

alter table public.notification_preferences add constraint notification_preferences_check CHECK (enabled = false OR consented_at IS NOT NULL AND revoked_at IS NULL);

alter table public.notification_preferences add constraint notification_preferences_purpose_check CHECK (purpose = ANY (ARRAY['transactional'::text, 'marketing'::text]));

alter table public.notification_subscriptions add constraint notification_subscriptions_channel_check CHECK (channel = ANY (ARRAY['web_push'::text, 'email'::text, 'sms'::text]));

alter table public.notification_templates add constraint notification_templates_body_check CHECK (char_length(body) >= 1 AND char_length(body) <= 4000);

alter table public.notification_templates add constraint notification_templates_channel_check CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text]));

alter table public.notification_templates add constraint notification_templates_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text]));

alter table public.notification_templates add constraint notification_templates_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]));

alter table public.notification_templates add constraint notification_templates_subject_check CHECK (subject IS NULL OR char_length(subject) >= 1 AND char_length(subject) <= 200);

alter table public.notification_templates add constraint notification_templates_template_key_check CHECK (template_key ~ '^[a-z0-9_.-]{3,80}$'::text);

alter table public.notification_templates add constraint notification_templates_version_check CHECK (version > 0);

alter table public.offer_revisions add constraint offer_revisions_check CHECK ((status <> ALL (ARRAY['approved'::text, 'rejected'::text])) OR reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL);

alter table public.offer_revisions add constraint offer_revisions_reason_check CHECK (char_length(TRIM(BOTH FROM reason)) >= 3 AND char_length(TRIM(BOTH FROM reason)) <= 500);

alter table public.offer_revisions add constraint offer_revisions_revision_no_check CHECK (revision_no > 0);

alter table public.offer_revisions add constraint offer_revisions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'superseded'::text]));

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_attempt_count_check CHECK (attempt_count >= 0 AND attempt_count <= 5);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_consumed_check CHECK ((status = ANY (ARRAY['verified'::text, 'cancelled'::text, 'expired'::text])) OR consumed_at IS NULL);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_expiry_check CHECK (expires_at > created_at);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_phone_check CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'::text);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_status_check CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'expired'::text, 'cancelled'::text]));

alter table public.patient_profiles add constraint patient_profiles_date_of_birth_check CHECK (date_of_birth IS NULL OR date_of_birth >= '1900-01-01'::date);

alter table public.patient_profiles add constraint patient_profiles_date_of_birth_not_future_check CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);

alter table public.patient_profiles add constraint patient_profiles_display_name_check CHECK (char_length(btrim(display_name)) >= 1 AND char_length(btrim(display_name)) <= 120);

alter table public.patient_profiles add constraint patient_profiles_gender_check CHECK (gender IS NULL OR (gender = ANY (ARRAY['female'::text, 'male'::text, 'other'::text, 'prefer_not_to_say'::text])));

alter table public.patient_profiles add constraint patient_profiles_national_id_format_check CHECK (national_id IS NULL OR national_id ~ '^[0-9]{11}$'::text);

alter table public.patient_profiles add constraint patient_profiles_nationality_format_check CHECK (nationality IS NULL OR nationality ~ '^[A-Z]{2}$'::text);

alter table public.patient_profiles add constraint patient_profiles_phone_format_check CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'::text);

alter table public.patient_profiles add constraint patient_profiles_relationship_check CHECK (relationship = ANY (ARRAY['self'::text, 'child'::text, 'spouse'::text, 'parent'::text, 'other'::text]));

alter table public.patient_profiles add constraint patient_profiles_verified_phone_requires_phone_check CHECK (phone_verified_at IS NULL OR phone IS NOT NULL);

alter table public.payment_intents add constraint payment_intents_amount_minor_check CHECK (amount_minor >= 0);

alter table public.payment_intents add constraint payment_intents_currency_check CHECK (currency = 'QAR'::bpchar);

alter table public.payment_intents add constraint payment_intents_status_check CHECK (status = ANY (ARRAY['created'::text, 'requires_action'::text, 'authorized'::text, 'captured'::text, 'cancelled'::text, 'refunded'::text, 'failed'::text]));

alter table public.price_disputes add constraint price_disputes_status_check CHECK (status = ANY (ARRAY['open'::text, 'clinic_response'::text, 'under_review'::text, 'resolved'::text, 'rejected'::text]));

alter table public.profiles add constraint profiles_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text]));

alter table public.rate_limit_buckets add constraint rate_limit_buckets_count_check CHECK (request_count >= 0);

alter table public.rate_limit_buckets add constraint rate_limit_buckets_expiry_check CHECK (expires_at > window_started_at);

alter table public.rate_limit_buckets add constraint rate_limit_buckets_scope_check CHECK (char_length(btrim(scope)) >= 3 AND char_length(btrim(scope)) <= 80);

alter table public.rate_limit_buckets add constraint rate_limit_buckets_subject_check CHECK (char_length(btrim(subject_key)) >= 3 AND char_length(btrim(subject_key)) <= 160);

alter table public.reconciliation_exceptions add constraint reconciliation_exceptions_status_check CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'ignored'::text]));

alter table public.report_exports add constraint report_exports_format_check CHECK (format = ANY (ARRAY['csv'::text, 'pdf'::text]));

alter table public.report_exports add constraint report_exports_report_kind_check CHECK (report_kind = ANY (ARRAY['weekly'::text, 'monthly'::text, 'annual'::text, 'settlement'::text, 'attendance'::text]));

alter table public.report_exports add constraint report_exports_status_check CHECK (status = ANY (ARRAY['queued'::text, 'generated'::text, 'expired'::text, 'failed'::text]));

alter table public.resources add constraint resources_resource_type_check CHECK (resource_type = ANY (ARRAY['chair'::text, 'room'::text, 'equipment'::text, 'pool'::text]));

alter table public.reviews add constraint reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

alter table public.reviews add constraint reviews_status_check CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'hidden'::text, 'disputed'::text, 'removed'::text]));

alter table public.settlement_periods add constraint settlement_periods_check CHECK (period_end >= period_start);

alter table public.settlement_periods add constraint settlement_periods_check1 CHECK ((status <> ALL (ARRAY['approved'::text, 'closed'::text])) OR approved_by IS NOT NULL AND approved_at IS NOT NULL);

alter table public.settlement_periods add constraint settlement_periods_check2 CHECK (status <> 'closed'::text OR closed_by IS NOT NULL AND closed_at IS NOT NULL);

alter table public.settlement_periods add constraint settlement_periods_currency_check CHECK (currency = 'QAR'::bpchar);

alter table public.settlement_periods add constraint settlement_periods_notes_check CHECK (notes IS NULL OR char_length(notes) <= 1000);

alter table public.settlement_periods add constraint settlement_periods_period_kind_check CHECK (period_kind = ANY (ARRAY['weekly'::text, 'monthly'::text, 'annual'::text, 'manual'::text]));

alter table public.settlement_periods add constraint settlement_periods_status_check CHECK (status = ANY (ARRAY['open'::text, 'proposed'::text, 'approved'::text, 'closed'::text, 'void'::text]));

alter table public.support_conversations add constraint support_conversations_escalation_reason_check CHECK (escalation_reason IS NULL OR char_length(escalation_reason) <= 500);

alter table public.support_conversations add constraint support_conversations_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text]));

alter table public.support_conversations add constraint support_conversations_safety_category_check CHECK (safety_category IS NULL OR (safety_category = ANY (ARRAY['standard'::text, 'medical'::text, 'emergency'::text, 'privacy'::text, 'billing'::text, 'abuse'::text])));

alter table public.support_conversations add constraint support_conversations_status_check CHECK (status = ANY (ARRAY['open'::text, 'escalated'::text, 'closed'::text]));

alter table public.support_knowledge_articles add constraint support_knowledge_articles_audience_check CHECK (audience = ANY (ARRAY['public'::text, 'clinic'::text, 'admin'::text]));

alter table public.support_knowledge_articles add constraint support_knowledge_articles_body_markdown_check CHECK (char_length(body_markdown) >= 10 AND char_length(body_markdown) <= 20000);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_category_check CHECK (category = ANY (ARRAY['booking'::text, 'pricing'::text, 'availability'::text, 'account'::text, 'clinic'::text, 'policy'::text, 'safety'::text]));

alter table public.support_knowledge_articles add constraint support_knowledge_articles_check CHECK (status <> 'approved'::text OR approved_by IS NOT NULL AND approved_at IS NOT NULL);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text]));

alter table public.support_knowledge_articles add constraint support_knowledge_articles_slug_check CHECK (slug ~ '^[a-z0-9-]{3,100}$'::text);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_status_check CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text]));

alter table public.support_knowledge_articles add constraint support_knowledge_articles_title_check CHECK (char_length(title) >= 3 AND char_length(title) <= 200);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_version_check CHECK (version > 0);

alter table public.support_messages add constraint support_messages_confidence_check CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric);

alter table public.support_messages add constraint support_messages_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 6000);

alter table public.support_messages add constraint support_messages_role_check CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'human_agent'::text]));

alter table public.support_messages add constraint support_messages_safety_category_check CHECK (safety_category IS NULL OR (safety_category = ANY (ARRAY['standard'::text, 'medical'::text, 'emergency'::text, 'privacy'::text, 'billing'::text, 'abuse'::text])));

alter table public.suspensions add constraint suspensions_severity_check CHECK (severity = ANY (ARRAY['warning'::text, 'restricted'::text, 'suspended'::text, 'blocked'::text]));

alter table public.suspensions add constraint suspensions_status_check CHECK (status = ANY (ARRAY['active'::text, 'lifted'::text, 'appealed'::text]));

alter table public.suspensions add constraint suspensions_subject_type_check CHECK (subject_type = ANY (ARRAY['clinic'::text, 'branch'::text, 'practitioner'::text, 'offer'::text, 'user'::text]));

alter table public.treatment_catalog add constraint treatment_catalog_comparison_version_check CHECK (comparison_version > 0);

alter table public.verification_records add constraint verification_records_status_check CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text, 'expired'::text, 'revoked'::text]));

alter table public.verification_records add constraint verification_records_subject_type_check CHECK (subject_type = ANY (ARRAY['clinic'::text, 'branch'::text, 'practitioner'::text]));

alter table public.account_usernames add constraint account_usernames_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.accounting_journal_lines add constraint accounting_journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES accounting_journals(id) ON DELETE RESTRICT;

alter table public.accounting_journals add constraint accounting_journals_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

alter table public.accounting_journals add constraint accounting_journals_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.accounting_journals add constraint accounting_journals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.accounting_journals add constraint accounting_journals_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id);

alter table public.accounting_journals add constraint accounting_journals_reversed_journal_id_fkey FOREIGN KEY (reversed_journal_id) REFERENCES accounting_journals(id) ON DELETE RESTRICT;

alter table public.accounting_journals add constraint accounting_journals_settlement_period_id_fkey FOREIGN KEY (settlement_period_id) REFERENCES settlement_periods(id) ON DELETE RESTRICT;

alter table public.audit_events add constraint audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.availability_slots add constraint availability_slots_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.availability_slots add constraint availability_slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.availability_slots add constraint availability_slots_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES practitioners(id) ON DELETE SET NULL;

alter table public.availability_slots add constraint availability_slots_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL;

alter table public.availability_slots add constraint availability_slots_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES treatment_variants(id) ON DELETE RESTRICT;

alter table public.booking_attendance_events add constraint booking_attendance_events_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;

alter table public.booking_attendance_events add constraint booking_attendance_events_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id);

alter table public.booking_status_history add constraint booking_status_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.booking_status_history add constraint booking_status_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

alter table public.bookings add constraint bookings_booked_by_user_id_fkey FOREIGN KEY (booked_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES branch_service_offers(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_patient_profile_id_fkey FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT;

alter table public.bookings add constraint bookings_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES practitioners(id) ON DELETE SET NULL;

alter table public.bookings add constraint bookings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL;

alter table public.bookings add constraint bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE RESTRICT;

alter table public.branch_hour_exceptions add constraint branch_hour_exceptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.branch_hours add constraint branch_hours_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.branch_service_offers add constraint branch_service_offers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.branch_service_offers add constraint branch_service_offers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES treatment_variants(id) ON DELETE RESTRICT;

alter table public.branch_service_offers add constraint branch_service_offers_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.branches add constraint branches_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

alter table public.clinic_fee_rules add constraint clinic_fee_rules_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

alter table public.clinic_fee_rules add constraint clinic_fee_rules_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.clinic_fee_rules add constraint clinic_fee_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.clinic_memberships add constraint clinic_memberships_branch_id_clinic_id_fkey FOREIGN KEY (branch_id, clinic_id) REFERENCES branches(id, clinic_id) ON DELETE CASCADE;

alter table public.clinic_memberships add constraint clinic_memberships_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.clinic_memberships add constraint clinic_memberships_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

alter table public.clinic_memberships add constraint clinic_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_operator_account_id_fkey FOREIGN KEY (operator_account_id) REFERENCES clinic_operator_accounts(id) ON DELETE SET NULL;

alter table public.clinic_operator_account_events add constraint clinic_operator_account_events_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES clinic_memberships(id) ON DELETE RESTRICT;

alter table public.clinic_operator_accounts add constraint clinic_operator_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.consent_records add constraint consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.customer_choice_events add constraint customer_choice_events_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES branch_service_offers(id) ON DELETE SET NULL;

alter table public.customer_choice_events add constraint customer_choice_events_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL;

alter table public.customer_choice_events add constraint customer_choice_events_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES treatment_catalog(id) ON DELETE SET NULL;

alter table public.customer_choice_events add constraint customer_choice_events_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES treatment_variants(id) ON DELETE SET NULL;

alter table public.device_installations add constraint device_installations_account_id_fkey FOREIGN KEY (account_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.idempotency_keys add constraint idempotency_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.instant_slots add constraint instant_slots_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES branch_service_offers(id) ON DELETE RESTRICT;

alter table public.instant_slots add constraint instant_slots_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE;

alter table public.notification_delivery_attempts add constraint notification_delivery_attempts_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES notification_outbox(id) ON DELETE RESTRICT;

alter table public.notification_outbox add constraint notification_outbox_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.notification_outbox add constraint notification_outbox_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.notification_outbox add constraint notification_outbox_template_id_fkey FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE RESTRICT;

alter table public.notification_preferences add constraint notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.notification_subscriptions add constraint notification_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.notification_templates add constraint notification_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.offer_revisions add constraint offer_revisions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES branch_service_offers(id) ON DELETE RESTRICT;

alter table public.offer_revisions add constraint offer_revisions_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);

alter table public.offer_revisions add constraint offer_revisions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_account_id_fkey FOREIGN KEY (account_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.patient_phone_verification_challenges add constraint patient_phone_verification_challenges_patient_profile_id_fkey FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT;

alter table public.patient_profiles add constraint patient_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.payment_events add constraint payment_events_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE CASCADE;

alter table public.payment_intents add constraint payment_intents_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;

alter table public.practitioners add constraint practitioners_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

alter table public.price_disputes add constraint price_disputes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

alter table public.price_disputes add constraint price_disputes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;

alter table public.price_disputes add constraint price_disputes_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES branch_service_offers(id) ON DELETE SET NULL;

alter table public.price_disputes add constraint price_disputes_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.reconciliation_exceptions add constraint reconciliation_exceptions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

alter table public.reconciliation_exceptions add constraint reconciliation_exceptions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.reconciliation_exceptions add constraint reconciliation_exceptions_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE SET NULL;

alter table public.report_exports add constraint report_exports_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.report_exports add constraint report_exports_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);

alter table public.report_exports add constraint report_exports_settlement_period_id_fkey FOREIGN KEY (settlement_period_id) REFERENCES settlement_periods(id) ON DELETE RESTRICT;

alter table public.resources add constraint resources_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

alter table public.reviews add constraint reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;

alter table public.reviews add constraint reviews_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.reviews add constraint reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.reviews add constraint reviews_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES practitioners(id) ON DELETE SET NULL;

alter table public.settlement_periods add constraint settlement_periods_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);

alter table public.settlement_periods add constraint settlement_periods_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

alter table public.settlement_periods add constraint settlement_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id);

alter table public.settlement_periods add constraint settlement_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.support_conversations add constraint support_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table public.support_knowledge_articles add constraint support_knowledge_articles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);

alter table public.support_knowledge_articles add constraint support_knowledge_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.support_messages add constraint support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE RESTRICT;

alter table public.suspensions add constraint suspensions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.treatment_variants add constraint treatment_variants_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES treatment_catalog(id) ON DELETE CASCADE;

alter table public.verification_records add constraint verification_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.bookings add constraint no_active_practitioner_overlap EXCLUDE USING gist (practitioner_id WITH =, booking_period WITH &&) WHERE (status = ANY (ARRAY['pending_hold'::text, 'pending_clinic_confirmation'::text, 'confirmed'::text, 'checked_in'::text]));

alter table public.bookings add constraint no_active_resource_overlap EXCLUDE USING gist (resource_id WITH =, booking_period WITH &&) WHERE (status = ANY (ARRAY['pending_hold'::text, 'pending_clinic_confirmation'::text, 'confirmed'::text, 'checked_in'::text]));

alter table public.branch_service_offers add constraint branch_service_offers_no_active_effective_overlap EXCLUDE USING gist (branch_id WITH =, variant_id WITH =, tstzrange(effective_from, COALESCE(effective_to, 'infinity'::timestamp with time zone), '[)'::text) WITH &&) WHERE (status = 'active'::text);

-- END asnani-production-constraints-ddl

-- BEGIN asnani-production-indexes-triggers-ddl

CREATE INDEX accounting_journal_lines_journal_idx ON public.accounting_journal_lines USING btree (journal_id);

CREATE INDEX accounting_journals_branch_id_idx ON public.accounting_journals USING btree (branch_id);

CREATE INDEX accounting_journals_clinic_status_idx ON public.accounting_journals USING btree (clinic_id, status, occurred_at DESC);

CREATE INDEX accounting_journals_created_by_idx ON public.accounting_journals USING btree (created_by);

CREATE INDEX accounting_journals_period_idx ON public.accounting_journals USING btree (settlement_period_id, occurred_at DESC);

CREATE INDEX accounting_journals_posted_by_idx ON public.accounting_journals USING btree (posted_by);

CREATE INDEX accounting_journals_reversed_journal_id_idx ON public.accounting_journals USING btree (reversed_journal_id);

CREATE INDEX audit_actor_idx ON public.audit_events USING btree (actor_id, created_at DESC);

CREATE INDEX audit_target_idx ON public.audit_events USING btree (target_type, target_id, created_at DESC);

CREATE INDEX availability_branch_time_idx ON public.availability_slots USING btree (branch_id, status, start_at);

CREATE INDEX availability_practitioner_time_idx ON public.availability_slots USING btree (practitioner_id, start_at);

CREATE INDEX availability_resource_time_idx ON public.availability_slots USING btree (resource_id, start_at);

CREATE INDEX availability_slots_created_by_idx ON public.availability_slots USING btree (created_by);

CREATE INDEX availability_slots_public_search_idx ON public.availability_slots USING btree (branch_id, variant_id, start_at) INCLUDE (id, end_at, expires_at) WHERE (status = 'published'::text);

CREATE INDEX availability_variant_time_idx ON public.availability_slots USING btree (variant_id, status, start_at);

CREATE INDEX booking_attendance_events_recorded_by_idx ON public.booking_attendance_events USING btree (recorded_by);

CREATE INDEX booking_attendance_occurred_idx ON public.booking_attendance_events USING btree (occurred_at DESC, booking_id);

CREATE INDEX booking_history_booking_idx ON public.booking_status_history USING btree (booking_id, created_at);

CREATE INDEX booking_status_history_actor_idx ON public.booking_status_history USING btree (actor_id);

CREATE INDEX bookings_booked_by_user_created_idx ON public.bookings USING btree (booked_by_user_id, created_at DESC);

CREATE INDEX bookings_branch_idx ON public.bookings USING btree (branch_id, status, start_at);

CREATE INDEX bookings_clinic_idx ON public.bookings USING btree (clinic_id);

CREATE INDEX bookings_clinic_start_at_idx ON public.bookings USING btree (clinic_id, start_at);

CREATE INDEX bookings_offer_idx ON public.bookings USING btree (offer_id);

CREATE INDEX bookings_patient_idx ON public.bookings USING btree (patient_id, created_at DESC);

CREATE INDEX bookings_patient_profile_idx ON public.bookings USING btree (patient_profile_id);

CREATE INDEX branch_hours_branch_idx ON public.branch_hours USING btree (branch_id, weekday);

CREATE INDEX branch_service_offers_public_search_idx ON public.branch_service_offers USING btree (variant_id, effective_from, branch_id) INCLUDE (id, effective_to, min_minor, max_minor, duration_minutes) WHERE (status = 'active'::text);

CREATE INDEX branches_clinic_idx ON public.branches USING btree (clinic_id);

CREATE INDEX branches_location_gist ON public.branches USING gist (location);

CREATE INDEX clinic_fee_rules_branch_id_idx ON public.clinic_fee_rules USING btree (branch_id);

CREATE INDEX clinic_fee_rules_created_by_idx ON public.clinic_fee_rules USING btree (created_by);

CREATE INDEX clinic_fee_rules_effective_idx ON public.clinic_fee_rules USING btree (clinic_id, branch_id, effective_from DESC) WHERE (status = 'active'::text);

CREATE INDEX clinic_memberships_branch_clinic_idx ON public.clinic_memberships USING btree (branch_id, clinic_id);

CREATE INDEX clinic_memberships_branch_idx ON public.clinic_memberships USING btree (branch_id);

CREATE INDEX clinic_memberships_clinic_idx ON public.clinic_memberships USING btree (clinic_id, branch_id, status);

CREATE INDEX clinic_memberships_user_idx ON public.clinic_memberships USING btree (user_id, status);

CREATE INDEX clinic_operator_account_events_actor_user_idx ON public.clinic_operator_account_events USING btree (actor_user_id);

CREATE INDEX clinic_operator_account_events_clinic_created_idx ON public.clinic_operator_account_events USING btree (clinic_id, created_at DESC);

CREATE INDEX clinic_operator_account_events_operator_account_idx ON public.clinic_operator_account_events USING btree (operator_account_id);

CREATE INDEX clinic_operator_account_events_operator_user_idx ON public.clinic_operator_account_events USING btree (operator_user_id);

CREATE INDEX clinic_operator_accounts_clinic_created_idx ON public.clinic_operator_accounts USING btree (clinic_id, created_at DESC);

CREATE INDEX clinic_operator_accounts_created_by_idx ON public.clinic_operator_accounts USING btree (created_by);

CREATE INDEX clinic_operator_accounts_membership_idx ON public.clinic_operator_accounts USING btree (membership_id);

CREATE INDEX consent_records_user_idx ON public.consent_records USING btree (user_id, created_at DESC);

CREATE INDEX customer_choice_events_created_idx ON public.customer_choice_events USING btree (created_at DESC);

CREATE INDEX customer_choice_events_name_idx ON public.customer_choice_events USING btree (event_name, created_at DESC);

CREATE INDEX customer_choice_events_offer_idx ON public.customer_choice_events USING btree (offer_id, created_at DESC) WHERE (offer_id IS NOT NULL);

CREATE INDEX customer_choice_events_session_idx ON public.customer_choice_events USING btree (session_id, created_at DESC);

CREATE INDEX customer_choice_events_slot_idx ON public.customer_choice_events USING btree (slot_id, created_at DESC) WHERE (slot_id IS NOT NULL);

CREATE INDEX customer_choice_events_treatment_idx ON public.customer_choice_events USING btree (treatment_id, created_at DESC) WHERE (treatment_id IS NOT NULL);

CREATE INDEX customer_choice_events_variant_idx ON public.customer_choice_events USING btree (variant_id, created_at DESC) WHERE (variant_id IS NOT NULL);

CREATE INDEX device_installations_account_last_seen_idx ON public.device_installations USING btree (account_id, last_seen_at DESC) WHERE (account_id IS NOT NULL);

CREATE INDEX idempotency_keys_user_idx ON public.idempotency_keys USING btree (user_id, expires_at);

CREATE INDEX idx_bookings_clinic_patient_created_at ON public.bookings USING btree (clinic_id, patient_profile_id, created_at);

CREATE INDEX instant_slots_offer_idx ON public.instant_slots USING btree (offer_id);

CREATE INDEX notification_delivery_attempts_outbox_idx ON public.notification_delivery_attempts USING btree (outbox_id, attempted_at DESC);

CREATE INDEX notification_outbox_created_by_idx ON public.notification_outbox USING btree (created_by);

CREATE INDEX notification_outbox_dispatch_idx ON public.notification_outbox USING btree (status, next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));

CREATE INDEX notification_outbox_recipient_idx ON public.notification_outbox USING btree (recipient_user_id, created_at DESC);

CREATE INDEX notification_outbox_template_id_idx ON public.notification_outbox USING btree (template_id);

CREATE INDEX notification_templates_created_by_idx ON public.notification_templates USING btree (created_by);

CREATE INDEX offer_revisions_offer_created_idx ON public.offer_revisions USING btree (offer_id, created_at DESC);

CREATE INDEX offer_revisions_requested_by_idx ON public.offer_revisions USING btree (requested_by);

CREATE INDEX offer_revisions_reviewed_by_idx ON public.offer_revisions USING btree (reviewed_by);

CREATE INDEX offers_branch_variant_idx ON public.branch_service_offers USING btree (branch_id, variant_id, status);

CREATE INDEX offers_current_idx ON public.branch_service_offers USING btree (status, effective_from, effective_to);

CREATE INDEX offers_variant_idx ON public.branch_service_offers USING btree (variant_id);

CREATE INDEX offers_verified_by_idx ON public.branch_service_offers USING btree (verified_by);

CREATE INDEX patient_phone_verification_challenges_account_idx ON public.patient_phone_verification_challenges USING btree (account_id, created_at DESC);

CREATE INDEX patient_phone_verification_challenges_profile_pending_idx ON public.patient_phone_verification_challenges USING btree (patient_profile_id, expires_at DESC) WHERE (status = 'pending'::text);

CREATE INDEX patient_profiles_account_active_idx ON public.patient_profiles USING btree (account_id, created_at DESC) WHERE (archived_at IS NULL);

CREATE INDEX patient_profiles_phone_idx ON public.patient_profiles USING btree (phone) WHERE (phone IS NOT NULL);

CREATE INDEX payment_events_intent_idx ON public.payment_events USING btree (payment_intent_id);

CREATE INDEX payment_intents_booking_idx ON public.payment_intents USING btree (booking_id);

CREATE INDEX practitioners_clinic_idx ON public.practitioners USING btree (clinic_id, active);

CREATE INDEX price_disputes_booking_idx ON public.price_disputes USING btree (booking_id);

CREATE INDEX price_disputes_branch_status_idx ON public.price_disputes USING btree (branch_id, status, created_at DESC);

CREATE INDEX price_disputes_offer_idx ON public.price_disputes USING btree (offer_id);

CREATE INDEX price_disputes_reporter_idx ON public.price_disputes USING btree (reporter_id, created_at DESC);

CREATE INDEX rate_limit_buckets_expiry_idx ON public.rate_limit_buckets USING btree (expires_at);

CREATE INDEX reconciliation_booking_idx ON public.reconciliation_exceptions USING btree (booking_id);

CREATE INDEX reconciliation_owner_idx ON public.reconciliation_exceptions USING btree (owner_id);

CREATE INDEX reconciliation_payment_idx ON public.reconciliation_exceptions USING btree (payment_intent_id);

CREATE INDEX report_exports_clinic_id_idx ON public.report_exports USING btree (clinic_id);

CREATE INDEX report_exports_requested_idx ON public.report_exports USING btree (requested_by, created_at DESC);

CREATE INDEX report_exports_settlement_period_id_idx ON public.report_exports USING btree (settlement_period_id);

CREATE INDEX resources_branch_idx ON public.resources USING btree (branch_id, active);

CREATE INDEX reviews_clinic_status_idx ON public.reviews USING btree (clinic_id, status, created_at DESC);

CREATE INDEX reviews_patient_idx ON public.reviews USING btree (patient_id, created_at DESC);

CREATE INDEX reviews_practitioner_idx ON public.reviews USING btree (practitioner_id, created_at DESC);

CREATE INDEX settlement_periods_approved_by_idx ON public.settlement_periods USING btree (approved_by);

CREATE INDEX settlement_periods_clinic_status_idx ON public.settlement_periods USING btree (clinic_id, status, period_start DESC);

CREATE INDEX settlement_periods_closed_by_idx ON public.settlement_periods USING btree (closed_by);

CREATE INDEX settlement_periods_created_by_idx ON public.settlement_periods USING btree (created_by);

CREATE INDEX support_conversations_user_idx ON public.support_conversations USING btree (user_id, status, updated_at DESC);

CREATE INDEX support_knowledge_active_idx ON public.support_knowledge_articles USING btree (locale, audience, category) WHERE (status = 'approved'::text);

CREATE INDEX support_knowledge_articles_approved_by_idx ON public.support_knowledge_articles USING btree (approved_by);

CREATE INDEX support_knowledge_articles_created_by_idx ON public.support_knowledge_articles USING btree (created_by);

CREATE INDEX support_messages_conversation_idx ON public.support_messages USING btree (conversation_id, created_at);

CREATE INDEX suspensions_created_by_idx ON public.suspensions USING btree (created_by);

CREATE INDEX treatment_variants_catalog_idx ON public.treatment_variants USING btree (catalog_id, active);

CREATE INDEX verification_records_created_by_idx ON public.verification_records USING btree (created_by);

CREATE INDEX verification_records_subject_idx ON public.verification_records USING btree (subject_type, subject_id, created_at DESC);

CREATE UNIQUE INDEX account_usernames_normalized_unique ON public.account_usernames USING btree (lower(username));

CREATE UNIQUE INDEX availability_slots_no_duplicate_operational_slot ON public.availability_slots USING btree (branch_id, variant_id, start_at, end_at, COALESCE(practitioner_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (status = ANY (ARRAY['draft'::text, 'published'::text, 'held'::text]));

CREATE UNIQUE INDEX booking_attendance_booking_sequence_uidx ON public.booking_attendance_events USING btree (booking_id, sequence_no);

CREATE UNIQUE INDEX bookings_booked_by_idempotency_key_key ON public.bookings USING btree (booked_by_user_id, idempotency_key);

CREATE UNIQUE INDEX clinic_memberships_unique_scope ON public.clinic_memberships USING btree (user_id, clinic_id, branch_id, role) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX clinic_operator_accounts_active_slot_unique ON public.clinic_operator_accounts USING btree (clinic_id, slot_no) WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX clinic_operator_accounts_active_user_unique ON public.clinic_operator_accounts USING btree (user_id) WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX notification_delivery_provider_message_idx ON public.notification_delivery_attempts USING btree (provider, provider_message_id) WHERE (provider_message_id IS NOT NULL);

CREATE UNIQUE INDEX notification_outbox_provider_message_idx ON public.notification_outbox USING btree (provider, provider_message_id) WHERE ((provider IS NOT NULL) AND (provider_message_id IS NOT NULL));

CREATE UNIQUE INDEX one_active_booking_per_slot ON public.bookings USING btree (slot_id) WHERE (status = ANY (ARRAY['pending_hold'::text, 'pending_clinic_confirmation'::text, 'confirmed'::text, 'checked_in'::text]));

CREATE UNIQUE INDEX patient_profiles_national_id_key ON public.patient_profiles USING btree (national_id) WHERE (national_id IS NOT NULL);

CREATE UNIQUE INDEX patient_profiles_one_active_self_per_account ON public.patient_profiles USING btree (account_id) WHERE ((relationship = 'self'::text) AND (archived_at IS NULL));

CREATE TRIGGER account_usernames_touch_updated_at BEFORE UPDATE ON account_usernames FOR EACH ROW EXECUTE FUNCTION private.touch_account_username_updated_at();

CREATE TRIGGER accounting_journal_lines_posted_guard BEFORE INSERT OR DELETE OR UPDATE ON accounting_journal_lines FOR EACH ROW EXECUTE FUNCTION private.guard_accounting_journal_lines();

CREATE TRIGGER accounting_journals_guard_update BEFORE UPDATE ON accounting_journals FOR EACH ROW EXECUTE FUNCTION private.guard_accounting_journal_update();

CREATE TRIGGER attendance_notification_outbox AFTER INSERT ON booking_attendance_events FOR EACH ROW EXECUTE FUNCTION private.enqueue_attendance_notifications();

CREATE TRIGGER availability_touch_updated_at BEFORE UPDATE ON availability_slots FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER booking_confirmed_notification_outbox AFTER INSERT OR UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION private.enqueue_booking_confirmed_notifications();

CREATE TRIGGER booking_insert_slot_sync AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION private.sync_slot_on_booking_insert();

CREATE TRIGGER booking_status_slot_sync AFTER UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION private.sync_slot_on_booking_status();

CREATE TRIGGER bookings_log_status AFTER UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION private.log_booking_status_change();

CREATE TRIGGER bookings_snapshot_immutable BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION private.prevent_booking_snapshot_mutation();

CREATE TRIGGER bookings_state_machine BEFORE UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION private.enforce_booking_state_transition();

CREATE TRIGGER bookings_touch_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER branch_hour_exceptions_touch_updated_at BEFORE UPDATE ON branch_hour_exceptions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER branch_hours_touch_updated_at BEFORE UPDATE ON branch_hours FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER branch_service_offers_public_scope_guard BEFORE INSERT OR UPDATE OF status, price_scope ON branch_service_offers FOR EACH ROW EXECUTE FUNCTION enforce_public_offer_price_scope();

CREATE TRIGGER branches_compliance_status_guard BEFORE INSERT OR UPDATE OF status ON branches FOR EACH ROW EXECUTE FUNCTION private.guard_compliance_status_change();

CREATE TRIGGER branches_touch_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER branches_verified_activation BEFORE INSERT OR UPDATE OF status ON branches FOR EACH ROW EXECUTE FUNCTION private.enforce_verified_activation();

CREATE TRIGGER clinics_compliance_status_guard BEFORE INSERT OR UPDATE OF status ON clinics FOR EACH ROW EXECUTE FUNCTION private.guard_compliance_status_change();

CREATE TRIGGER clinics_touch_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER clinics_verified_activation BEFORE INSERT OR UPDATE OF status ON clinics FOR EACH ROW EXECUTE FUNCTION private.enforce_verified_activation();

CREATE TRIGGER device_installations_touch_updated_at BEFORE UPDATE ON device_installations FOR EACH ROW EXECUTE FUNCTION private.touch_device_installation_updated_at();

CREATE TRIGGER instant_slots_touch_updated_at BEFORE UPDATE ON instant_slots FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER memberships_touch_updated_at BEFORE UPDATE ON clinic_memberships FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER offer_activation_gate BEFORE INSERT OR UPDATE OF status ON branch_service_offers FOR EACH ROW EXECUTE FUNCTION private.enforce_offer_activation();

CREATE TRIGGER offer_verification_fields_guard BEFORE INSERT OR UPDATE ON branch_service_offers FOR EACH ROW EXECUTE FUNCTION private.guard_offer_verification_fields();

CREATE TRIGGER offers_touch_updated_at BEFORE UPDATE ON branch_service_offers FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER patient_phone_verification_challenges_touch_updated_at BEFORE UPDATE ON patient_phone_verification_challenges FOR EACH ROW EXECUTE FUNCTION private.touch_patient_phone_verification_challenge_updated_at();

CREATE TRIGGER patient_profiles_touch_updated_at BEFORE UPDATE ON patient_profiles FOR EACH ROW EXECUTE FUNCTION private.touch_patient_profile_updated_at();

CREATE TRIGGER payment_intents_touch_updated_at BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER practitioners_touch_updated_at BEFORE UPDATE ON practitioners FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER practitioners_verified_activation BEFORE INSERT OR UPDATE OF active ON practitioners FOR EACH ROW EXECUTE FUNCTION private.enforce_verified_activation();

CREATE TRIGGER price_disputes_touch_updated_at BEFORE UPDATE ON price_disputes FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER reconciliation_touch_updated_at BEFORE UPDATE ON reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER resources_touch_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER review_status_guard BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION private.guard_review_status();

CREATE TRIGGER reviews_touch_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER slot_publication_gate BEFORE INSERT OR UPDATE OF status ON availability_slots FOR EACH ROW EXECUTE FUNCTION private.enforce_slot_publication();

CREATE TRIGGER suspensions_touch_updated_at BEFORE UPDATE ON suspensions FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER treatment_catalog_touch_updated_at BEFORE UPDATE ON treatment_catalog FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER treatment_variants_touch_updated_at BEFORE UPDATE ON treatment_variants FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

-- END asnani-production-indexes-triggers-ddl

-- BEGIN asnani-production-rls-force-ddl

alter table public.account_usernames no force row level security;

alter table public.accounting_journal_lines no force row level security;

alter table public.accounting_journals no force row level security;

alter table public.audit_events no force row level security;

alter table public.availability_slots no force row level security;

alter table public.booking_attendance_events no force row level security;

alter table public.booking_status_history no force row level security;

alter table public.bookings no force row level security;

alter table public.branch_hour_exceptions no force row level security;

alter table public.branch_hours no force row level security;

alter table public.branch_service_offers no force row level security;

alter table public.branches no force row level security;

alter table public.clinic_fee_rules no force row level security;

alter table public.clinic_memberships no force row level security;

alter table public.clinic_operator_account_events no force row level security;

alter table public.clinic_operator_accounts no force row level security;

alter table public.clinics no force row level security;

alter table public.consent_records no force row level security;

alter table public.customer_choice_events no force row level security;

alter table public.device_installations no force row level security;

alter table public.feature_flags no force row level security;

alter table public.idempotency_keys no force row level security;

alter table public.instant_slots no force row level security;

alter table public.notification_delivery_attempts no force row level security;

alter table public.notification_outbox no force row level security;

alter table public.notification_preferences no force row level security;

alter table public.notification_subscriptions no force row level security;

alter table public.notification_templates no force row level security;

alter table public.offer_revisions no force row level security;

alter table public.patient_phone_verification_challenges no force row level security;

alter table public.patient_profiles no force row level security;

alter table public.payment_events no force row level security;

alter table public.payment_intents no force row level security;

alter table public.practitioners no force row level security;

alter table public.price_disputes no force row level security;

alter table public.profiles no force row level security;

alter table public.rate_limit_buckets no force row level security;

alter table public.reconciliation_exceptions no force row level security;

alter table public.report_exports no force row level security;

alter table public.resources no force row level security;

alter table public.reviews no force row level security;

alter table public.settlement_periods no force row level security;

alter table public.support_conversations no force row level security;

alter table public.support_knowledge_articles no force row level security;

alter table public.support_messages no force row level security;

alter table public.suspensions no force row level security;

alter table public.treatment_catalog no force row level security;

alter table public.treatment_variants no force row level security;

alter table public.verification_records no force row level security;

-- END asnani-production-rls-force-ddl

-- BEGIN asnani-production-rls-policies-ddl

alter table public.clinic_operator_account_events enable row level security;

alter table public.notification_templates enable row level security;

alter table public.profiles enable row level security;

alter table public.clinics enable row level security;

alter table public.branch_service_offers enable row level security;

alter table public.treatment_catalog enable row level security;

alter table public.treatment_variants enable row level security;

alter table public.availability_slots enable row level security;

alter table public.resources enable row level security;

alter table public.customer_choice_events enable row level security;

alter table public.payment_events enable row level security;

alter table public.reconciliation_exceptions enable row level security;

alter table public.instant_slots enable row level security;

alter table public.payment_intents enable row level security;

alter table public.suspensions enable row level security;

alter table public.patient_phone_verification_challenges enable row level security;

alter table public.reviews enable row level security;

alter table public.audit_events enable row level security;

alter table public.verification_records enable row level security;

alter table public.branches enable row level security;

alter table public.practitioners enable row level security;

alter table public.idempotency_keys enable row level security;

alter table public.clinic_memberships enable row level security;

alter table public.branch_hours enable row level security;

alter table public.branch_hour_exceptions enable row level security;

alter table public.price_disputes enable row level security;

alter table public.booking_status_history enable row level security;

alter table public.consent_records enable row level security;

alter table public.notification_subscriptions enable row level security;

alter table public.feature_flags enable row level security;

alter table public.accounting_journal_lines enable row level security;

alter table public.clinic_fee_rules enable row level security;

alter table public.accounting_journals enable row level security;

alter table public.booking_attendance_events enable row level security;

alter table public.offer_revisions enable row level security;

alter table public.report_exports enable row level security;

alter table public.settlement_periods enable row level security;

alter table public.support_knowledge_articles enable row level security;

alter table public.notification_preferences enable row level security;

alter table public.notification_delivery_attempts enable row level security;

alter table public.notification_outbox enable row level security;

alter table public.support_conversations enable row level security;

alter table public.support_messages enable row level security;

alter table public.device_installations enable row level security;

alter table public.bookings enable row level security;

alter table public.patient_profiles enable row level security;

alter table public.rate_limit_buckets enable row level security;

alter table public.account_usernames enable row level security;

alter table public.clinic_operator_accounts enable row level security;

create policy profiles_select_own on public.profiles as permissive for select to authenticated using ((( SELECT auth.uid() AS uid) = id));

create policy profiles_insert_own on public.profiles as permissive for insert to authenticated with check ((( SELECT auth.uid() AS uid) = id));

create policy profiles_update_own on public.profiles as permissive for update to authenticated using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));

create policy offers_public_select on public.branch_service_offers as permissive for select to anon using (((status = 'active'::text) AND (effective_from <= now()) AND ((effective_to IS NULL) OR (effective_to > now())) AND (EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_service_offers.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy availability_anon_select on public.availability_slots as permissive for select to anon using (((status = 'published'::text) AND (start_at > now()) AND ((expires_at IS NULL) OR (expires_at > now())) AND (EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = availability_slots.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy clinics_public_select on public.clinics as permissive for select to anon using (((status = 'active'::text) AND (NOT is_synthetic)));

create policy clinics_authenticated_select on public.clinics as permissive for select to authenticated using ((((status = 'active'::text) AND (NOT is_synthetic)) OR ( SELECT private.is_clinic_member(clinics.id, NULL::text[]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy branches_member_insert on public.branches as permissive for insert to authenticated with check (( SELECT private.is_clinic_member(branches.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member));

create policy branches_public_select on public.branches as permissive for select to anon using (((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = branches.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy branches_authenticated_select on public.branches as permissive for select to authenticated using ((((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = branches.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR ( SELECT private.has_branch_access(branches.id, NULL::text[]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy practitioners_public_select on public.practitioners as permissive for select to anon using ((active AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = practitioners.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy practitioners_authenticated_select on public.practitioners as permissive for select to authenticated using (((active AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = practitioners.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR ( SELECT private.is_clinic_member(practitioners.clinic_id, NULL::text[]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy practitioners_member_insert on public.practitioners as permissive for insert to authenticated with check (( SELECT private.is_clinic_member(practitioners.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member));

create policy branch_hours_anon_select on public.branch_hours as permissive for select to anon using ((EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_hours.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic)))));

create policy branch_hours_auth_select on public.branch_hours as permissive for select to authenticated using (((EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_hours.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic)))) OR ( SELECT private.has_branch_access(branch_hours.branch_id, NULL::text[]) AS has_branch_access)));

create policy branch_exceptions_anon_select on public.branch_hour_exceptions as permissive for select to anon using ((EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_hour_exceptions.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic)))));

create policy branch_exceptions_auth_select on public.branch_hour_exceptions as permissive for select to authenticated using (((EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_hour_exceptions.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic)))) OR ( SELECT private.has_branch_access(branch_hour_exceptions.branch_id, NULL::text[]) AS has_branch_access)));

create policy instant_slots_anon_select on public.instant_slots as permissive for select to anon using (((status = 'published'::text) AND (publish_at <= now()) AND (expires_at > now()) AND (EXISTS ( SELECT 1
   FROM ((branch_service_offers o
     JOIN branches b ON ((b.id = o.branch_id)))
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((o.id = instant_slots.offer_id) AND (o.status = 'active'::text) AND (o.effective_from <= now()) AND ((o.effective_to IS NULL) OR (o.effective_to > now())) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy instant_slots_auth_select on public.instant_slots as permissive for select to authenticated using ((((status = 'published'::text) AND (publish_at <= now()) AND (expires_at > now()) AND (EXISTS ( SELECT 1
   FROM ((branch_service_offers o
     JOIN branches b ON ((b.id = o.branch_id)))
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((o.id = instant_slots.offer_id) AND (o.status = 'active'::text) AND (o.effective_from <= now()) AND ((o.effective_to IS NULL) OR (o.effective_to > now())) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR (EXISTS ( SELECT 1
   FROM availability_slots s
  WHERE ((s.id = instant_slots.slot_id) AND ( SELECT private.has_branch_access(s.branch_id, NULL::text[]) AS has_branch_access))))));

create policy reviews_anon_select on public.reviews as permissive for select to anon using (((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = reviews.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))));

create policy resources_staff on public.resources as permissive for all to authenticated using (( SELECT private.has_branch_access(resources.branch_id, NULL::text[]) AS has_branch_access)) with check (( SELECT private.has_branch_access(resources.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy reviews_auth_select on public.reviews as permissive for select to authenticated using ((((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = reviews.clinic_id) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR (patient_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_clinic_member(reviews.clinic_id, NULL::text[]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy booking_history_select on public.booking_status_history as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.id = booking_status_history.booking_id) AND ((b.patient_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_branch_access(b.branch_id, NULL::text[]) AS has_branch_access))))));

create policy treatment_catalog_platform_admin_insert on public.treatment_catalog as permissive for insert to authenticated with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy payment_intents_select on public.payment_intents as permissive for select to authenticated using ((EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.id = payment_intents.booking_id) AND ((b.patient_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_branch_access(b.branch_id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access))))));

create policy consents_select_own on public.consent_records as permissive for select to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));

create policy consents_insert_own on public.consent_records as permissive for insert to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy treatment_catalog_platform_admin_update on public.treatment_catalog as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy treatment_catalog_platform_admin_delete on public.treatment_catalog as permissive for delete to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy treatment_variants_platform_admin_insert on public.treatment_variants as permissive for insert to authenticated with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy price_disputes_insert on public.price_disputes as permissive for insert to authenticated with check ((reporter_id = ( SELECT auth.uid() AS uid)));

create policy treatment_variants_platform_admin_update on public.treatment_variants as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy notifications_own on public.notification_subscriptions as permissive for all to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy feature_flags_read on public.feature_flags as permissive for select to anon, authenticated using (true);

create policy audit_events_client_deny on public.audit_events as permissive for select to authenticated using (false);

create policy idempotency_keys_client_deny on public.idempotency_keys as permissive for select to authenticated using (false);

create policy payment_events_client_deny on public.payment_events as permissive for select to authenticated using (false);

create policy reconciliation_client_deny on public.reconciliation_exceptions as permissive for select to authenticated using (false);

create policy branch_hours_staff_insert on public.branch_hours as permissive for insert to authenticated with check (( SELECT private.has_branch_access(branch_hours.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy branch_hours_staff_update on public.branch_hours as permissive for update to authenticated using (( SELECT private.has_branch_access(branch_hours.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access)) with check (( SELECT private.has_branch_access(branch_hours.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy branch_hours_staff_delete on public.branch_hours as permissive for delete to authenticated using (( SELECT private.has_branch_access(branch_hours.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy branch_exceptions_staff_insert on public.branch_hour_exceptions as permissive for insert to authenticated with check (( SELECT private.has_branch_access(branch_hour_exceptions.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy branch_exceptions_staff_update on public.branch_hour_exceptions as permissive for update to authenticated using (( SELECT private.has_branch_access(branch_hour_exceptions.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access)) with check (( SELECT private.has_branch_access(branch_hour_exceptions.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy branch_exceptions_staff_delete on public.branch_hour_exceptions as permissive for delete to authenticated using (( SELECT private.has_branch_access(branch_hour_exceptions.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access));

create policy instant_slots_staff_insert on public.instant_slots as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM availability_slots s
  WHERE ((s.id = instant_slots.slot_id) AND ( SELECT private.has_branch_access(s.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access)))));

create policy instant_slots_staff_update on public.instant_slots as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM availability_slots s
  WHERE ((s.id = instant_slots.slot_id) AND ( SELECT private.has_branch_access(s.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access))))) with check ((EXISTS ( SELECT 1
   FROM availability_slots s
  WHERE ((s.id = instant_slots.slot_id) AND ( SELECT private.has_branch_access(s.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access)))));

create policy instant_slots_staff_delete on public.instant_slots as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM availability_slots s
  WHERE ((s.id = instant_slots.slot_id) AND ( SELECT private.has_branch_access(s.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access)))));

create policy treatment_variants_platform_admin_delete on public.treatment_variants as permissive for delete to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy clinics_authorized_update on public.clinics as permissive for update to authenticated using ((( SELECT private.is_clinic_member(clinics.id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.is_clinic_member(clinics.id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy feature_flags_platform_admin_insert on public.feature_flags as permissive for insert to authenticated with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy feature_flags_platform_admin_update on public.feature_flags as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy feature_flags_platform_admin_delete on public.feature_flags as permissive for delete to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy offers_authenticated_select on public.branch_service_offers as permissive for select to authenticated using ((((status = 'active'::text) AND (effective_from <= now()) AND ((effective_to IS NULL) OR (effective_to > now())) AND (EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = branch_service_offers.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR ( SELECT private.has_branch_access(branch_service_offers.branch_id, NULL::text[]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy practitioners_authorized_update on public.practitioners as permissive for update to authenticated using ((( SELECT private.is_clinic_member(practitioners.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.is_clinic_member(practitioners.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy offers_authenticated_insert on public.branch_service_offers as permissive for insert to authenticated with check ((( SELECT private.has_branch_access(branch_service_offers.branch_id, ARRAY['owner'::text, 'manager'::text, 'pricing_manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy offers_authenticated_update on public.branch_service_offers as permissive for update to authenticated using ((( SELECT private.has_branch_access(branch_service_offers.branch_id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.has_branch_access(branch_service_offers.branch_id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy offers_authenticated_delete on public.branch_service_offers as permissive for delete to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy availability_authenticated_select on public.availability_slots as permissive for select to authenticated using ((((status = 'published'::text) AND (start_at > now()) AND ((expires_at IS NULL) OR (expires_at > now())) AND (EXISTS ( SELECT 1
   FROM (branches b
     JOIN clinics c ON ((c.id = b.clinic_id)))
  WHERE ((b.id = availability_slots.branch_id) AND (b.status = 'active'::text) AND (c.status = 'active'::text) AND (NOT c.is_synthetic))))) OR ( SELECT private.has_branch_access(availability_slots.branch_id, NULL::text[]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy availability_authenticated_insert on public.availability_slots as permissive for insert to authenticated with check ((( SELECT private.has_branch_access(availability_slots.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy verification_platform_admin_insert on public.verification_records as permissive for insert to authenticated with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy availability_authenticated_update on public.availability_slots as permissive for update to authenticated using ((( SELECT private.has_branch_access(availability_slots.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.has_branch_access(availability_slots.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy availability_authenticated_delete on public.availability_slots as permissive for delete to authenticated using ((( SELECT private.has_branch_access(availability_slots.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy verification_platform_admin_update on public.verification_records as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy patient_profiles_authenticated_select on public.patient_profiles as permissive for select to authenticated using (((account_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.patient_profile_id = patient_profiles.id) AND private.has_branch_access(b.branch_id, ARRAY['owner'::text, 'manager'::text, 'receptionist'::text]))))));

create policy "platform admins can read customer choice events" on public.customer_choice_events as permissive for select to authenticated using (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy treatment_catalog_authenticated on public.treatment_catalog as permissive for select to authenticated using ((active OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy treatment_variants_anon_active on public.treatment_variants as permissive for select to anon using (active);

create policy treatment_variants_authenticated on public.treatment_variants as permissive for select to authenticated using ((active OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy suspensions_platform_admin_insert on public.suspensions as permissive for insert to authenticated with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy suspensions_platform_admin_update on public.suspensions as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy memberships_manage_insert on public.clinic_memberships as permissive for insert to authenticated with check ((( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['owner'::text]) AS is_clinic_member) OR ((role = ANY (ARRAY['receptionist'::text, 'pricing_manager'::text, 'viewer'::text])) AND ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['manager'::text]) AS is_clinic_member))));

create policy branches_authorized_update on public.branches as permissive for update to authenticated using ((( SELECT private.has_branch_access(branches.id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.is_clinic_member(branches.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy memberships_select on public.clinic_memberships as permissive for select to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['owner'::text, 'manager'::text]) AS is_clinic_member) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy memberships_authorized_update on public.clinic_memberships as permissive for update to authenticated using ((( SELECT private.is_platform_admin() AS is_platform_admin) OR ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['owner'::text]) AS is_clinic_member) OR ((role = ANY (ARRAY['receptionist'::text, 'pricing_manager'::text, 'viewer'::text])) AND ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['manager'::text]) AS is_clinic_member)))) with check ((( SELECT private.is_platform_admin() AS is_platform_admin) OR ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['owner'::text]) AS is_clinic_member) OR ((role = ANY (ARRAY['receptionist'::text, 'pricing_manager'::text, 'viewer'::text])) AND ( SELECT private.is_clinic_member(clinic_memberships.clinic_id, ARRAY['manager'::text]) AS is_clinic_member))));

create policy treatment_catalog_anon_active on public.treatment_catalog as permissive for select to anon using (active);

create policy verification_authorized_select on public.verification_records as permissive for select to authenticated using ((( SELECT private.is_platform_admin() AS is_platform_admin) OR ((subject_type = 'clinic'::text) AND ( SELECT private.is_clinic_member(verification_records.subject_id, NULL::text[]) AS is_clinic_member)) OR ((subject_type = 'branch'::text) AND ( SELECT private.has_branch_access(verification_records.subject_id, NULL::text[]) AS has_branch_access)) OR ((subject_type = 'practitioner'::text) AND (EXISTS ( SELECT 1
   FROM practitioners p
  WHERE ((p.id = verification_records.subject_id) AND ( SELECT private.is_clinic_member(p.clinic_id, NULL::text[]) AS is_clinic_member)))))));

create policy price_disputes_select on public.price_disputes as permissive for select to authenticated using (((reporter_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_branch_access(price_disputes.branch_id, NULL::text[]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy price_disputes_authorized_update on public.price_disputes as permissive for update to authenticated using ((( SELECT private.has_branch_access(price_disputes.branch_id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin))) with check ((( SELECT private.has_branch_access(price_disputes.branch_id, ARRAY['owner'::text, 'manager'::text]) AS has_branch_access) OR ( SELECT private.is_platform_admin() AS is_platform_admin)));

create policy suspensions_platform_admin_select on public.suspensions as permissive for select to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin));

create policy "offer revisions visible to related clinic" on public.offer_revisions as permissive for select to public using (((EXISTS ( SELECT 1
   FROM ((branch_service_offers o
     JOIN branches b ON ((b.id = o.branch_id)))
     JOIN clinic_memberships cm ON ((cm.clinic_id = b.clinic_id)))
  WHERE ((o.id = offer_revisions.offer_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.status = 'active'::text)))) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "attendance visible to related clinic" on public.booking_attendance_events as permissive for select to public using (((EXISTS ( SELECT 1
   FROM (bookings b
     JOIN clinic_memberships cm ON ((cm.clinic_id = b.clinic_id)))
  WHERE ((b.id = booking_attendance_events.booking_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.status = 'active'::text)))) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "clinic fee rules admin only" on public.clinic_fee_rules as permissive for all to public using (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)) with check (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy "settlement periods admin or clinic owner read" on public.settlement_periods as permissive for select to public using ((COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false) OR (EXISTS ( SELECT 1
   FROM clinic_memberships cm
  WHERE ((cm.clinic_id = settlement_periods.clinic_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.status = 'active'::text) AND (cm.role = ANY (ARRAY['owner'::text, 'manager'::text])))))));

create policy "journals admin or clinic owner read" on public.accounting_journals as permissive for select to public using ((COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false) OR (EXISTS ( SELECT 1
   FROM clinic_memberships cm
  WHERE ((cm.clinic_id = accounting_journals.clinic_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.status = 'active'::text) AND (cm.role = ANY (ARRAY['owner'::text, 'manager'::text])))))));

create policy "journal lines follow visible journal" on public.accounting_journal_lines as permissive for select to public using ((EXISTS ( SELECT 1
   FROM accounting_journals j
  WHERE ((j.id = accounting_journal_lines.journal_id) AND (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false) OR (EXISTS ( SELECT 1
           FROM clinic_memberships cm
          WHERE ((cm.clinic_id = j.clinic_id) AND (cm.user_id = ( SELECT auth.uid() AS uid)) AND (cm.status = 'active'::text) AND (cm.role = ANY (ARRAY['owner'::text, 'manager'::text]))))))))));

create policy "report exports requester or admin" on public.report_exports as permissive for select to public using (((requested_by = ( SELECT auth.uid() AS uid)) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "support conversations belong to user" on public.support_conversations as permissive for select to public using (((user_id = ( SELECT auth.uid() AS uid)) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "users manage own notification preferences" on public.notification_preferences as permissive for all to public using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "notification templates admin only" on public.notification_templates as permissive for all to public using (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)) with check (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy "users read own notification outbox" on public.notification_outbox as permissive for select to public using (((recipient_user_id = ( SELECT auth.uid() AS uid)) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "notification attempts admin only" on public.notification_delivery_attempts as permissive for select to public using (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy "approved public knowledge is readable" on public.support_knowledge_articles as permissive for select to public using ((((status = 'approved'::text) AND (audience = 'public'::text)) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)));

create policy "support messages visible to conversation owner" on public.support_messages as permissive for select to public using ((EXISTS ( SELECT 1
   FROM support_conversations c
  WHERE ((c.id = support_messages.conversation_id) AND ((c.user_id = ( SELECT auth.uid() AS uid)) OR COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false))))));

create policy bookings_select on public.bookings as permissive for select to public using (((booked_by_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_branch_access(bookings.branch_id, NULL::text[]) AS has_branch_access)));

create policy device_installations_no_client_access on public.device_installations as permissive for all to authenticated using (false) with check (false);

create policy rate_limit_buckets_no_client_access on public.rate_limit_buckets as permissive for all to authenticated using (false) with check (false);

create policy "support knowledge admin insert" on public.support_knowledge_articles as permissive for insert to authenticated with check (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy "support knowledge admin update" on public.support_knowledge_articles as permissive for update to authenticated using (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false)) with check (COALESCE((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean, false));

create policy patient_phone_verification_challenges_no_client_access on public.patient_phone_verification_challenges as permissive for all to authenticated using (false) with check (false);

create policy "deny client access to account usernames" on public.account_usernames as restrictive for all to anon, authenticated using (false) with check (false);

create policy "deny client access to clinic operator accounts" on public.clinic_operator_accounts as restrictive for all to anon, authenticated using (false) with check (false);

create policy "deny client access to clinic operator account events" on public.clinic_operator_account_events as restrictive for all to anon, authenticated using (false) with check (false);

create policy reviews_insert_completed on public.reviews as permissive for insert to authenticated with check (((patient_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.id = reviews.booking_id) AND (b.patient_id = ( SELECT auth.uid() AS uid)) AND (b.status = 'completed'::text) AND (reviews.clinic_id = b.clinic_id) AND (NOT (reviews.practitioner_id IS DISTINCT FROM b.practitioner_id)))))));

create policy reviews_authorized_update on public.reviews as permissive for update to authenticated using (( SELECT private.is_platform_admin() AS is_platform_admin)) with check (( SELECT private.is_platform_admin() AS is_platform_admin));

-- END asnani-production-rls-policies-ddl

-- BEGIN explicit role grants captured from catalog

grant DELETE on table public.account_usernames to anon;

grant DELETE on table public.account_usernames to authenticated;

grant DELETE on table public.account_usernames to service_role;

grant DELETE on table public.accounting_journal_lines to anon;

grant DELETE on table public.accounting_journal_lines to authenticated;

grant DELETE on table public.accounting_journal_lines to service_role;

grant DELETE on table public.accounting_journals to anon;

grant DELETE on table public.accounting_journals to authenticated;

grant DELETE on table public.accounting_journals to service_role;

grant DELETE on table public.audit_events to anon;

grant DELETE on table public.audit_events to authenticated;

grant DELETE on table public.audit_events to service_role;

grant DELETE on table public.availability_slots to anon;

grant DELETE on table public.availability_slots to authenticated;

grant DELETE on table public.availability_slots to service_role;

grant DELETE on table public.booking_attendance_events to anon;

grant DELETE on table public.booking_attendance_events to authenticated;

grant DELETE on table public.booking_attendance_events to service_role;

grant DELETE on table public.booking_status_history to anon;

grant DELETE on table public.booking_status_history to authenticated;

grant DELETE on table public.booking_status_history to service_role;

grant DELETE on table public.bookings to anon;

grant DELETE on table public.bookings to authenticated;

grant DELETE on table public.bookings to service_role;

grant DELETE on table public.branch_hour_exceptions to anon;

grant DELETE on table public.branch_hour_exceptions to authenticated;

grant DELETE on table public.branch_hour_exceptions to service_role;

grant DELETE on table public.branch_hours to anon;

grant DELETE on table public.branch_hours to authenticated;

grant DELETE on table public.branch_hours to service_role;

grant DELETE on table public.branch_service_offers to anon;

grant DELETE on table public.branch_service_offers to authenticated;

grant DELETE on table public.branch_service_offers to service_role;

grant DELETE on table public.branches to anon;

grant DELETE on table public.branches to authenticated;

grant DELETE on table public.branches to service_role;

grant DELETE on table public.clinic_fee_rules to anon;

grant DELETE on table public.clinic_fee_rules to authenticated;

grant DELETE on table public.clinic_fee_rules to service_role;

grant DELETE on table public.clinic_memberships to anon;

grant DELETE on table public.clinic_memberships to authenticated;

grant DELETE on table public.clinic_memberships to service_role;

grant DELETE on table public.clinic_operator_account_events to anon;

grant DELETE on table public.clinic_operator_account_events to authenticated;

grant DELETE on table public.clinic_operator_account_events to service_role;

grant DELETE on table public.clinic_operator_accounts to anon;

grant DELETE on table public.clinic_operator_accounts to authenticated;

grant DELETE on table public.clinic_operator_accounts to service_role;

grant DELETE on table public.clinics to anon;

grant DELETE on table public.clinics to authenticated;

grant DELETE on table public.clinics to service_role;

grant DELETE on table public.consent_records to anon;

grant DELETE on table public.consent_records to authenticated;

grant DELETE on table public.consent_records to service_role;

grant DELETE on table public.customer_choice_events to anon;

grant DELETE on table public.customer_choice_events to authenticated;

grant DELETE on table public.customer_choice_events to service_role;

grant DELETE on table public.device_installations to anon;

grant DELETE on table public.device_installations to authenticated;

grant DELETE on table public.device_installations to service_role;

grant DELETE on table public.feature_flags to anon;

grant DELETE on table public.feature_flags to authenticated;

grant DELETE on table public.feature_flags to service_role;

grant DELETE on table public.idempotency_keys to anon;

grant DELETE on table public.idempotency_keys to authenticated;

grant DELETE on table public.idempotency_keys to service_role;

grant DELETE on table public.instant_slots to anon;

grant DELETE on table public.instant_slots to authenticated;

grant DELETE on table public.instant_slots to service_role;

grant DELETE on table public.notification_delivery_attempts to anon;

grant DELETE on table public.notification_delivery_attempts to authenticated;

grant DELETE on table public.notification_delivery_attempts to service_role;

grant DELETE on table public.notification_outbox to anon;

grant DELETE on table public.notification_outbox to authenticated;

grant DELETE on table public.notification_outbox to service_role;

grant DELETE on table public.notification_preferences to anon;

grant DELETE on table public.notification_preferences to authenticated;

grant DELETE on table public.notification_preferences to service_role;

grant DELETE on table public.notification_subscriptions to anon;

grant DELETE on table public.notification_subscriptions to authenticated;

grant DELETE on table public.notification_subscriptions to service_role;

grant DELETE on table public.notification_templates to anon;

grant DELETE on table public.notification_templates to authenticated;

grant DELETE on table public.notification_templates to service_role;

grant DELETE on table public.offer_revisions to anon;

grant DELETE on table public.offer_revisions to authenticated;

grant DELETE on table public.offer_revisions to service_role;

grant DELETE on table public.patient_phone_verification_challenges to anon;

grant DELETE on table public.patient_phone_verification_challenges to authenticated;

grant DELETE on table public.patient_phone_verification_challenges to service_role;

grant DELETE on table public.patient_profiles to anon;

grant DELETE on table public.patient_profiles to authenticated;

grant DELETE on table public.patient_profiles to service_role;

grant DELETE on table public.payment_events to anon;

grant DELETE on table public.payment_events to authenticated;

grant DELETE on table public.payment_events to service_role;

grant DELETE on table public.payment_intents to anon;

grant DELETE on table public.payment_intents to authenticated;

grant DELETE on table public.payment_intents to service_role;

grant DELETE on table public.practitioners to anon;

grant DELETE on table public.practitioners to authenticated;

grant DELETE on table public.practitioners to service_role;

grant DELETE on table public.price_disputes to anon;

grant DELETE on table public.price_disputes to authenticated;

grant DELETE on table public.price_disputes to service_role;

grant DELETE on table public.profiles to anon;

grant DELETE on table public.profiles to authenticated;

grant DELETE on table public.profiles to service_role;

grant DELETE on table public.rate_limit_buckets to anon;

grant DELETE on table public.rate_limit_buckets to authenticated;

grant DELETE on table public.rate_limit_buckets to service_role;

grant DELETE on table public.reconciliation_exceptions to anon;

grant DELETE on table public.reconciliation_exceptions to authenticated;

grant DELETE on table public.reconciliation_exceptions to service_role;

grant DELETE on table public.report_exports to anon;

grant DELETE on table public.report_exports to authenticated;

grant DELETE on table public.report_exports to service_role;

grant DELETE on table public.resources to anon;

grant DELETE on table public.resources to authenticated;

grant DELETE on table public.resources to service_role;

grant DELETE on table public.reviews to anon;

grant DELETE on table public.reviews to authenticated;

grant DELETE on table public.reviews to service_role;

grant DELETE on table public.settlement_periods to anon;

grant DELETE on table public.settlement_periods to authenticated;

grant DELETE on table public.settlement_periods to service_role;

grant DELETE on table public.support_conversations to anon;

grant DELETE on table public.support_conversations to authenticated;

grant DELETE on table public.support_conversations to service_role;

grant DELETE on table public.support_knowledge_articles to anon;

grant DELETE on table public.support_knowledge_articles to authenticated;

grant DELETE on table public.support_knowledge_articles to service_role;

grant DELETE on table public.support_messages to anon;

grant DELETE on table public.support_messages to authenticated;

grant DELETE on table public.support_messages to service_role;

grant DELETE on table public.suspensions to anon;

grant DELETE on table public.suspensions to authenticated;

grant DELETE on table public.suspensions to service_role;

grant DELETE on table public.treatment_catalog to anon;

grant DELETE on table public.treatment_catalog to authenticated;

grant DELETE on table public.treatment_catalog to service_role;

grant DELETE on table public.treatment_variants to anon;

grant DELETE on table public.treatment_variants to authenticated;

grant DELETE on table public.treatment_variants to service_role;

grant DELETE on table public.verification_records to anon;

grant DELETE on table public.verification_records to authenticated;

grant DELETE on table public.verification_records to service_role;

grant EXECUTE on function private.create_clinic_application_internal(p_legal_name text, p_display_name text) to authenticated;

grant EXECUTE on function private.has_branch_access(p_branch_id uuid, p_roles text[]) to authenticated;

grant EXECUTE on function private.has_branch_access(p_branch_id uuid, p_roles text[]) to service_role;

grant EXECUTE on function private.is_clinic_member(p_clinic_id uuid, p_roles text[]) to authenticated;

grant EXECUTE on function private.is_clinic_member(p_clinic_id uuid, p_roles text[]) to service_role;

grant EXECUTE on function private.is_platform_admin() to authenticated;

grant EXECUTE on function private.is_platform_admin() to service_role;

grant EXECUTE on function public.admin_customer_choice_analytics(p_days integer) to anon;

grant EXECUTE on function public.admin_customer_choice_analytics(p_days integer) to authenticated;

grant EXECUTE on function public.admin_customer_choice_analytics(p_days integer) to service_role;

grant EXECUTE on function public.audit_clinic_operator_password_reset(p_operator_account_id uuid) to anon;

grant EXECUTE on function public.audit_clinic_operator_password_reset(p_operator_account_id uuid) to authenticated;

grant EXECUTE on function public.audit_clinic_operator_password_reset(p_operator_account_id uuid) to service_role;

grant EXECUTE on function public.audit_clinic_operator_password_reset_server(p_actor_id uuid, p_operator_account_id uuid) to anon;

grant EXECUTE on function public.audit_clinic_operator_password_reset_server(p_actor_id uuid, p_operator_account_id uuid) to authenticated;

grant EXECUTE on function public.audit_clinic_operator_password_reset_server(p_actor_id uuid, p_operator_account_id uuid) to service_role;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text) to anon;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text) to authenticated;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text) to service_role;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to anon;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to authenticated;

grant EXECUTE on function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to service_role;

grant EXECUTE on function public.book_slot_server(p_actor_id uuid, p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to anon;

grant EXECUTE on function public.book_slot_server(p_actor_id uuid, p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to authenticated;

grant EXECUTE on function public.book_slot_server(p_actor_id uuid, p_slot_id uuid, p_offer_id uuid, p_idempotency_key text, p_patient_profile_id uuid) to service_role;

grant EXECUTE on function public.cancel_booking_server(p_actor_id uuid, p_booking_id uuid) to anon;

grant EXECUTE on function public.cancel_booking_server(p_actor_id uuid, p_booking_id uuid) to authenticated;

grant EXECUTE on function public.cancel_booking_server(p_actor_id uuid, p_booking_id uuid) to service_role;

grant EXECUTE on function public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text) to anon;

grant EXECUTE on function public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text) to authenticated;

grant EXECUTE on function public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text) to service_role;

grant EXECUTE on function public.clinic_activity_report_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date, p_granularity text) to anon;

grant EXECUTE on function public.clinic_activity_report_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date, p_granularity text) to authenticated;

grant EXECUTE on function public.clinic_activity_report_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date, p_granularity text) to service_role;

grant EXECUTE on function public.clinic_booking_patient_details(p_booking_ids uuid[]) to anon;

grant EXECUTE on function public.clinic_booking_patient_details(p_booking_ids uuid[]) to authenticated;

grant EXECUTE on function public.clinic_booking_patient_details(p_booking_ids uuid[]) to service_role;

grant EXECUTE on function public.complete_patient_phone_verification_server(p_actor_id uuid, p_challenge_id uuid, p_patient_profile_id uuid) to anon;

grant EXECUTE on function public.complete_patient_phone_verification_server(p_actor_id uuid, p_challenge_id uuid, p_patient_profile_id uuid) to authenticated;

grant EXECUTE on function public.complete_patient_phone_verification_server(p_actor_id uuid, p_challenge_id uuid, p_patient_profile_id uuid) to service_role;

grant EXECUTE on function public.consume_rate_limit_server(p_scope text, p_subject_key text, p_limit integer, p_window_seconds integer) to anon;

grant EXECUTE on function public.consume_rate_limit_server(p_scope text, p_subject_key text, p_limit integer, p_window_seconds integer) to authenticated;

grant EXECUTE on function public.consume_rate_limit_server(p_scope text, p_subject_key text, p_limit integer, p_window_seconds integer) to service_role;

grant EXECUTE on function public.create_branch_application(p_clinic_id uuid, p_name text, p_area text, p_address_line text, p_lat double precision, p_lng double precision) to anon;

grant EXECUTE on function public.create_branch_application(p_clinic_id uuid, p_name text, p_area text, p_address_line text, p_lat double precision, p_lng double precision) to authenticated;

grant EXECUTE on function public.create_branch_application(p_clinic_id uuid, p_name text, p_area text, p_address_line text, p_lat double precision, p_lng double precision) to service_role;

grant EXECUTE on function public.create_clinic_application(p_legal_name text, p_display_name text) to anon;

grant EXECUTE on function public.create_clinic_application(p_legal_name text, p_display_name text) to authenticated;

grant EXECUTE on function public.create_clinic_application(p_legal_name text, p_display_name text) to service_role;

grant EXECUTE on function public.create_settlement_period(p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to anon;

grant EXECUTE on function public.create_settlement_period(p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to authenticated;

grant EXECUTE on function public.create_settlement_period(p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to service_role;

grant EXECUTE on function public.create_settlement_period_server(p_actor_id uuid, p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to anon;

grant EXECUTE on function public.create_settlement_period_server(p_actor_id uuid, p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to authenticated;

grant EXECUTE on function public.create_settlement_period_server(p_actor_id uuid, p_clinic_id uuid, p_period_start date, p_period_end date, p_period_kind text, p_notes text) to service_role;

grant EXECUTE on function public.enforce_public_offer_price_scope() to anon;

grant EXECUTE on function public.enforce_public_offer_price_scope() to authenticated;

grant EXECUTE on function public.enforce_public_offer_price_scope() to service_role;

grant EXECUTE on function public.financial_report_summary(p_clinic_id uuid, p_start date, p_end date) to anon;

grant EXECUTE on function public.financial_report_summary(p_clinic_id uuid, p_start date, p_end date) to authenticated;

grant EXECUTE on function public.financial_report_summary(p_clinic_id uuid, p_start date, p_end date) to service_role;

grant EXECUTE on function public.financial_report_summary_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date) to anon;

grant EXECUTE on function public.financial_report_summary_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date) to authenticated;

grant EXECUTE on function public.financial_report_summary_server(p_actor_id uuid, p_clinic_id uuid, p_start date, p_end date) to service_role;

grant EXECUTE on function public.handle_new_account_patient_profile() to anon;

grant EXECUTE on function public.handle_new_account_patient_profile() to authenticated;

grant EXECUTE on function public.handle_new_account_patient_profile() to service_role;

grant EXECUTE on function public.is_price_scope_publishable(p_scope jsonb) to anon;

grant EXECUTE on function public.is_price_scope_publishable(p_scope jsonb) to authenticated;

grant EXECUTE on function public.is_price_scope_publishable(p_scope jsonb) to service_role;

grant EXECUTE on function public.is_valid_price_scope(p_scope jsonb) to anon;

grant EXECUTE on function public.is_valid_price_scope(p_scope jsonb) to authenticated;

grant EXECUTE on function public.is_valid_price_scope(p_scope jsonb) to service_role;

grant EXECUTE on function public.list_clinic_operator_accounts(p_clinic_id uuid) to anon;

grant EXECUTE on function public.list_clinic_operator_accounts(p_clinic_id uuid) to authenticated;

grant EXECUTE on function public.list_clinic_operator_accounts(p_clinic_id uuid) to service_role;

grant EXECUTE on function public.list_clinic_operator_accounts_server(p_actor_id uuid, p_clinic_id uuid) to anon;

grant EXECUTE on function public.list_clinic_operator_accounts_server(p_actor_id uuid, p_clinic_id uuid) to authenticated;

grant EXECUTE on function public.list_clinic_operator_accounts_server(p_actor_id uuid, p_clinic_id uuid) to service_role;

grant EXECUTE on function public.list_operational_client_accounts_server(p_actor_id uuid) to anon;

grant EXECUTE on function public.list_operational_client_accounts_server(p_actor_id uuid) to authenticated;

grant EXECUTE on function public.list_operational_client_accounts_server(p_actor_id uuid) to service_role;

grant EXECUTE on function public.platform_activity_report_server(p_actor_id uuid, p_start date, p_end date, p_granularity text) to anon;

grant EXECUTE on function public.platform_activity_report_server(p_actor_id uuid, p_start date, p_end date, p_granularity text) to authenticated;

grant EXECUTE on function public.platform_activity_report_server(p_actor_id uuid, p_start date, p_end date, p_granularity text) to service_role;

grant EXECUTE on function public.provision_clinic_operator_account(p_clinic_id uuid, p_user_id uuid, p_username text) to anon;

grant EXECUTE on function public.provision_clinic_operator_account(p_clinic_id uuid, p_user_id uuid, p_username text) to authenticated;

grant EXECUTE on function public.provision_clinic_operator_account(p_clinic_id uuid, p_user_id uuid, p_username text) to service_role;

grant EXECUTE on function public.provision_clinic_operator_account_server(p_actor_id uuid, p_clinic_id uuid, p_user_id uuid, p_username text) to anon;

grant EXECUTE on function public.provision_clinic_operator_account_server(p_actor_id uuid, p_clinic_id uuid, p_user_id uuid, p_username text) to authenticated;

grant EXECUTE on function public.provision_clinic_operator_account_server(p_actor_id uuid, p_clinic_id uuid, p_user_id uuid, p_username text) to service_role;

grant EXECUTE on function public.provision_operational_client_account_server(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_user_id uuid, p_username text) to anon;

grant EXECUTE on function public.provision_operational_client_account_server(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_user_id uuid, p_username text) to authenticated;

grant EXECUTE on function public.provision_operational_client_account_server(p_actor_id uuid, p_clinic_id uuid, p_branch_id uuid, p_user_id uuid, p_username text) to service_role;

grant EXECUTE on function public.record_booking_check_in(p_booking_id uuid, p_reason text) to anon;

grant EXECUTE on function public.record_booking_check_in(p_booking_id uuid, p_reason text) to authenticated;

grant EXECUTE on function public.record_booking_check_in(p_booking_id uuid, p_reason text) to service_role;

grant EXECUTE on function public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to anon;

grant EXECUTE on function public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to authenticated;

grant EXECUTE on function public.record_booking_check_in_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to service_role;

grant EXECUTE on function public.register_device_installation_guarded_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text, p_client_subject_key text, p_installation_subject_key text) to anon;

grant EXECUTE on function public.register_device_installation_guarded_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text, p_client_subject_key text, p_installation_subject_key text) to authenticated;

grant EXECUTE on function public.register_device_installation_guarded_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text, p_client_subject_key text, p_installation_subject_key text) to service_role;

grant EXECUTE on function public.register_device_installation_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text) to anon;

grant EXECUTE on function public.register_device_installation_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text) to authenticated;

grant EXECUTE on function public.register_device_installation_server(p_account_id uuid, p_installation_id uuid, p_device_label text, p_platform text, p_browser text, p_device_class text, p_app_version text) to service_role;

grant EXECUTE on function public.request_offer_revision(p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to anon;

grant EXECUTE on function public.request_offer_revision(p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to authenticated;

grant EXECUTE on function public.request_offer_revision(p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to service_role;

grant EXECUTE on function public.request_offer_revision_server(p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to anon;

grant EXECUTE on function public.request_offer_revision_server(p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to authenticated;

grant EXECUTE on function public.request_offer_revision_server(p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text) to service_role;

grant EXECUTE on function public.reverse_booking_attendance(p_booking_id uuid, p_reason text) to anon;

grant EXECUTE on function public.reverse_booking_attendance(p_booking_id uuid, p_reason text) to authenticated;

grant EXECUTE on function public.reverse_booking_attendance(p_booking_id uuid, p_reason text) to service_role;

grant EXECUTE on function public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to anon;

grant EXECUTE on function public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to authenticated;

grant EXECUTE on function public.reverse_booking_attendance_server(p_actor_id uuid, p_booking_id uuid, p_reason text) to service_role;

grant EXECUTE on function public.review_offer_revision(p_revision_id uuid, p_approve boolean, p_reason text) to anon;

grant EXECUTE on function public.review_offer_revision(p_revision_id uuid, p_approve boolean, p_reason text) to authenticated;

grant EXECUTE on function public.review_offer_revision(p_revision_id uuid, p_approve boolean, p_reason text) to service_role;

grant EXECUTE on function public.review_offer_revision_server(p_actor_id uuid, p_revision_id uuid, p_approve boolean, p_reason text) to anon;

grant EXECUTE on function public.review_offer_revision_server(p_actor_id uuid, p_revision_id uuid, p_approve boolean, p_reason text) to authenticated;

grant EXECUTE on function public.review_offer_revision_server(p_actor_id uuid, p_revision_id uuid, p_approve boolean, p_reason text) to service_role;

grant EXECUTE on function public.revoke_clinic_operator_account(p_operator_account_id uuid) to anon;

grant EXECUTE on function public.revoke_clinic_operator_account(p_operator_account_id uuid) to authenticated;

grant EXECUTE on function public.revoke_clinic_operator_account(p_operator_account_id uuid) to service_role;

grant EXECUTE on function public.revoke_clinic_operator_account_server(p_actor_id uuid, p_operator_account_id uuid) to anon;

grant EXECUTE on function public.revoke_clinic_operator_account_server(p_actor_id uuid, p_operator_account_id uuid) to authenticated;

grant EXECUTE on function public.revoke_clinic_operator_account_server(p_actor_id uuid, p_operator_account_id uuid) to service_role;

grant EXECUTE on function public.revoke_operational_client_account_server(p_actor_id uuid, p_operator_account_id uuid) to anon;

grant EXECUTE on function public.revoke_operational_client_account_server(p_actor_id uuid, p_operator_account_id uuid) to authenticated;

grant EXECUTE on function public.revoke_operational_client_account_server(p_actor_id uuid, p_operator_account_id uuid) to service_role;

grant EXECUTE on function public.search_dental_offers(p_variant_id uuid, p_lat double precision, p_lng double precision, p_radius_km double precision) to anon;

grant EXECUTE on function public.search_dental_offers(p_variant_id uuid, p_lat double precision, p_lng double precision, p_radius_km double precision) to authenticated;

grant EXECUTE on function public.search_dental_offers(p_variant_id uuid, p_lat double precision, p_lng double precision, p_radius_km double precision) to service_role;

grant EXECUTE on function public.verify_and_activate_server(p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_source text, p_identifier text) to anon;

grant EXECUTE on function public.verify_and_activate_server(p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_source text, p_identifier text) to authenticated;

grant EXECUTE on function public.verify_and_activate_server(p_actor_id uuid, p_subject_type text, p_subject_id uuid, p_source text, p_identifier text) to service_role;

grant INSERT on table public.account_usernames to anon;

grant INSERT on table public.account_usernames to authenticated;

grant INSERT on table public.account_usernames to service_role;

grant INSERT on table public.accounting_journal_lines to anon;

grant INSERT on table public.accounting_journal_lines to authenticated;

grant INSERT on table public.accounting_journal_lines to service_role;

grant INSERT on table public.accounting_journals to anon;

grant INSERT on table public.accounting_journals to authenticated;

grant INSERT on table public.accounting_journals to service_role;

grant INSERT on table public.audit_events to anon;

grant INSERT on table public.audit_events to authenticated;

grant INSERT on table public.audit_events to service_role;

grant INSERT on table public.availability_slots to anon;

grant INSERT on table public.availability_slots to authenticated;

grant INSERT on table public.availability_slots to service_role;

grant INSERT on table public.booking_attendance_events to anon;

grant INSERT on table public.booking_attendance_events to authenticated;

grant INSERT on table public.booking_attendance_events to service_role;

grant INSERT on table public.booking_status_history to anon;

grant INSERT on table public.booking_status_history to authenticated;

grant INSERT on table public.booking_status_history to service_role;

grant INSERT on table public.bookings to anon;

grant INSERT on table public.bookings to authenticated;

grant INSERT on table public.bookings to service_role;

grant INSERT on table public.branch_hour_exceptions to anon;

grant INSERT on table public.branch_hour_exceptions to authenticated;

grant INSERT on table public.branch_hour_exceptions to service_role;

grant INSERT on table public.branch_hours to anon;

grant INSERT on table public.branch_hours to authenticated;

grant INSERT on table public.branch_hours to service_role;

grant INSERT on table public.branch_service_offers to anon;

grant INSERT on table public.branch_service_offers to authenticated;

grant INSERT on table public.branch_service_offers to service_role;

grant INSERT on table public.branches to anon;

grant INSERT on table public.branches to authenticated;

grant INSERT on table public.branches to service_role;

grant INSERT on table public.clinic_fee_rules to anon;

grant INSERT on table public.clinic_fee_rules to authenticated;

grant INSERT on table public.clinic_fee_rules to service_role;

grant INSERT on table public.clinic_memberships to anon;

grant INSERT on table public.clinic_memberships to authenticated;

grant INSERT on table public.clinic_memberships to service_role;

grant INSERT on table public.clinic_operator_account_events to anon;

grant INSERT on table public.clinic_operator_account_events to authenticated;

grant INSERT on table public.clinic_operator_account_events to service_role;

grant INSERT on table public.clinic_operator_accounts to anon;

grant INSERT on table public.clinic_operator_accounts to authenticated;

grant INSERT on table public.clinic_operator_accounts to service_role;

grant INSERT on table public.clinics to anon;

grant INSERT on table public.clinics to authenticated;

grant INSERT on table public.clinics to service_role;

grant INSERT on table public.consent_records to anon;

grant INSERT on table public.consent_records to authenticated;

grant INSERT on table public.consent_records to service_role;

grant INSERT on table public.customer_choice_events to anon;

grant INSERT on table public.customer_choice_events to authenticated;

grant INSERT on table public.customer_choice_events to service_role;

grant INSERT on table public.device_installations to anon;

grant INSERT on table public.device_installations to authenticated;

grant INSERT on table public.device_installations to service_role;

grant INSERT on table public.feature_flags to anon;

grant INSERT on table public.feature_flags to authenticated;

grant INSERT on table public.feature_flags to service_role;

grant INSERT on table public.idempotency_keys to anon;

grant INSERT on table public.idempotency_keys to authenticated;

grant INSERT on table public.idempotency_keys to service_role;

grant INSERT on table public.instant_slots to anon;

grant INSERT on table public.instant_slots to authenticated;

grant INSERT on table public.instant_slots to service_role;

grant INSERT on table public.notification_delivery_attempts to anon;

grant INSERT on table public.notification_delivery_attempts to authenticated;

grant INSERT on table public.notification_delivery_attempts to service_role;

grant INSERT on table public.notification_outbox to anon;

grant INSERT on table public.notification_outbox to authenticated;

grant INSERT on table public.notification_outbox to service_role;

grant INSERT on table public.notification_preferences to anon;

grant INSERT on table public.notification_preferences to authenticated;

grant INSERT on table public.notification_preferences to service_role;

grant INSERT on table public.notification_subscriptions to anon;

grant INSERT on table public.notification_subscriptions to authenticated;

grant INSERT on table public.notification_subscriptions to service_role;

grant INSERT on table public.notification_templates to anon;

grant INSERT on table public.notification_templates to authenticated;

grant INSERT on table public.notification_templates to service_role;

grant INSERT on table public.offer_revisions to anon;

grant INSERT on table public.offer_revisions to authenticated;

grant INSERT on table public.offer_revisions to service_role;

grant INSERT on table public.patient_phone_verification_challenges to anon;

grant INSERT on table public.patient_phone_verification_challenges to authenticated;

grant INSERT on table public.patient_phone_verification_challenges to service_role;

grant INSERT on table public.patient_profiles to anon;

grant INSERT on table public.patient_profiles to authenticated;

grant INSERT on table public.patient_profiles to service_role;

grant INSERT on table public.payment_events to anon;

grant INSERT on table public.payment_events to authenticated;

grant INSERT on table public.payment_events to service_role;

grant INSERT on table public.payment_intents to anon;

grant INSERT on table public.payment_intents to authenticated;

grant INSERT on table public.payment_intents to service_role;

grant INSERT on table public.practitioners to anon;

grant INSERT on table public.practitioners to authenticated;

grant INSERT on table public.practitioners to service_role;

grant INSERT on table public.price_disputes to anon;

grant INSERT on table public.price_disputes to authenticated;

grant INSERT on table public.price_disputes to service_role;

grant INSERT on table public.profiles to anon;

grant INSERT on table public.profiles to authenticated;

grant INSERT on table public.profiles to service_role;

grant INSERT on table public.rate_limit_buckets to anon;

grant INSERT on table public.rate_limit_buckets to authenticated;

grant INSERT on table public.rate_limit_buckets to service_role;

grant INSERT on table public.reconciliation_exceptions to anon;

grant INSERT on table public.reconciliation_exceptions to authenticated;

grant INSERT on table public.reconciliation_exceptions to service_role;

grant INSERT on table public.report_exports to anon;

grant INSERT on table public.report_exports to authenticated;

grant INSERT on table public.report_exports to service_role;

grant INSERT on table public.resources to anon;

grant INSERT on table public.resources to authenticated;

grant INSERT on table public.resources to service_role;

grant INSERT on table public.reviews to anon;

grant INSERT on table public.reviews to authenticated;

grant INSERT on table public.reviews to service_role;

grant INSERT on table public.settlement_periods to anon;

grant INSERT on table public.settlement_periods to authenticated;

grant INSERT on table public.settlement_periods to service_role;

grant INSERT on table public.support_conversations to anon;

grant INSERT on table public.support_conversations to authenticated;

grant INSERT on table public.support_conversations to service_role;

grant INSERT on table public.support_knowledge_articles to anon;

grant INSERT on table public.support_knowledge_articles to authenticated;

grant INSERT on table public.support_knowledge_articles to service_role;

grant INSERT on table public.support_messages to anon;

grant INSERT on table public.support_messages to authenticated;

grant INSERT on table public.support_messages to service_role;

grant INSERT on table public.suspensions to anon;

grant INSERT on table public.suspensions to authenticated;

grant INSERT on table public.suspensions to service_role;

grant INSERT on table public.treatment_catalog to anon;

grant INSERT on table public.treatment_catalog to authenticated;

grant INSERT on table public.treatment_catalog to service_role;

grant INSERT on table public.treatment_variants to anon;

grant INSERT on table public.treatment_variants to authenticated;

grant INSERT on table public.treatment_variants to service_role;

grant INSERT on table public.verification_records to anon;

grant INSERT on table public.verification_records to authenticated;

grant INSERT on table public.verification_records to service_role;

grant MAINTAIN on table public.account_usernames to anon;

grant MAINTAIN on table public.account_usernames to authenticated;

grant MAINTAIN on table public.account_usernames to service_role;

grant MAINTAIN on table public.accounting_journal_lines to anon;

grant MAINTAIN on table public.accounting_journal_lines to authenticated;

grant MAINTAIN on table public.accounting_journal_lines to service_role;

grant MAINTAIN on table public.accounting_journals to anon;

grant MAINTAIN on table public.accounting_journals to authenticated;

grant MAINTAIN on table public.accounting_journals to service_role;

grant MAINTAIN on table public.audit_events to anon;

grant MAINTAIN on table public.audit_events to authenticated;

grant MAINTAIN on table public.audit_events to service_role;

grant MAINTAIN on table public.availability_slots to anon;

grant MAINTAIN on table public.availability_slots to authenticated;

grant MAINTAIN on table public.availability_slots to service_role;

grant MAINTAIN on table public.booking_attendance_events to anon;

grant MAINTAIN on table public.booking_attendance_events to authenticated;

grant MAINTAIN on table public.booking_attendance_events to service_role;

grant MAINTAIN on table public.booking_status_history to anon;

grant MAINTAIN on table public.booking_status_history to authenticated;

grant MAINTAIN on table public.booking_status_history to service_role;

grant MAINTAIN on table public.bookings to anon;

grant MAINTAIN on table public.bookings to authenticated;

grant MAINTAIN on table public.bookings to service_role;

grant MAINTAIN on table public.branch_hour_exceptions to anon;

grant MAINTAIN on table public.branch_hour_exceptions to authenticated;

grant MAINTAIN on table public.branch_hour_exceptions to service_role;

grant MAINTAIN on table public.branch_hours to anon;

grant MAINTAIN on table public.branch_hours to authenticated;

grant MAINTAIN on table public.branch_hours to service_role;

grant MAINTAIN on table public.branch_service_offers to anon;

grant MAINTAIN on table public.branch_service_offers to authenticated;

grant MAINTAIN on table public.branch_service_offers to service_role;

grant MAINTAIN on table public.branches to anon;

grant MAINTAIN on table public.branches to authenticated;

grant MAINTAIN on table public.branches to service_role;

grant MAINTAIN on table public.clinic_fee_rules to anon;

grant MAINTAIN on table public.clinic_fee_rules to authenticated;

grant MAINTAIN on table public.clinic_fee_rules to service_role;

grant MAINTAIN on table public.clinic_memberships to anon;

grant MAINTAIN on table public.clinic_memberships to authenticated;

grant MAINTAIN on table public.clinic_memberships to service_role;

grant MAINTAIN on table public.clinic_operator_account_events to anon;

grant MAINTAIN on table public.clinic_operator_account_events to authenticated;

grant MAINTAIN on table public.clinic_operator_account_events to service_role;

grant MAINTAIN on table public.clinic_operator_accounts to anon;

grant MAINTAIN on table public.clinic_operator_accounts to authenticated;

grant MAINTAIN on table public.clinic_operator_accounts to service_role;

grant MAINTAIN on table public.clinics to anon;

grant MAINTAIN on table public.clinics to authenticated;

grant MAINTAIN on table public.clinics to service_role;

grant MAINTAIN on table public.consent_records to anon;

grant MAINTAIN on table public.consent_records to authenticated;

grant MAINTAIN on table public.consent_records to service_role;

grant MAINTAIN on table public.customer_choice_events to anon;

grant MAINTAIN on table public.customer_choice_events to authenticated;

grant MAINTAIN on table public.customer_choice_events to service_role;

grant MAINTAIN on table public.device_installations to anon;

grant MAINTAIN on table public.device_installations to authenticated;

grant MAINTAIN on table public.device_installations to service_role;

grant MAINTAIN on table public.feature_flags to anon;

grant MAINTAIN on table public.feature_flags to authenticated;

grant MAINTAIN on table public.feature_flags to service_role;

grant MAINTAIN on table public.idempotency_keys to anon;

grant MAINTAIN on table public.idempotency_keys to authenticated;

grant MAINTAIN on table public.idempotency_keys to service_role;

grant MAINTAIN on table public.instant_slots to anon;

grant MAINTAIN on table public.instant_slots to authenticated;

grant MAINTAIN on table public.instant_slots to service_role;

grant MAINTAIN on table public.notification_delivery_attempts to anon;

grant MAINTAIN on table public.notification_delivery_attempts to authenticated;

grant MAINTAIN on table public.notification_delivery_attempts to service_role;

grant MAINTAIN on table public.notification_outbox to anon;

grant MAINTAIN on table public.notification_outbox to authenticated;

grant MAINTAIN on table public.notification_outbox to service_role;

grant MAINTAIN on table public.notification_preferences to anon;

grant MAINTAIN on table public.notification_preferences to authenticated;

grant MAINTAIN on table public.notification_preferences to service_role;

grant MAINTAIN on table public.notification_subscriptions to anon;

grant MAINTAIN on table public.notification_subscriptions to authenticated;

grant MAINTAIN on table public.notification_subscriptions to service_role;

grant MAINTAIN on table public.notification_templates to anon;

grant MAINTAIN on table public.notification_templates to authenticated;

grant MAINTAIN on table public.notification_templates to service_role;

grant MAINTAIN on table public.offer_revisions to anon;

grant MAINTAIN on table public.offer_revisions to authenticated;

grant MAINTAIN on table public.offer_revisions to service_role;

grant MAINTAIN on table public.patient_phone_verification_challenges to anon;

grant MAINTAIN on table public.patient_phone_verification_challenges to authenticated;

grant MAINTAIN on table public.patient_phone_verification_challenges to service_role;

grant MAINTAIN on table public.patient_profiles to anon;

grant MAINTAIN on table public.patient_profiles to authenticated;

grant MAINTAIN on table public.patient_profiles to service_role;

grant MAINTAIN on table public.payment_events to anon;

grant MAINTAIN on table public.payment_events to authenticated;

grant MAINTAIN on table public.payment_events to service_role;

grant MAINTAIN on table public.payment_intents to anon;

grant MAINTAIN on table public.payment_intents to authenticated;

grant MAINTAIN on table public.payment_intents to service_role;

grant MAINTAIN on table public.practitioners to anon;

grant MAINTAIN on table public.practitioners to authenticated;

grant MAINTAIN on table public.practitioners to service_role;

grant MAINTAIN on table public.price_disputes to anon;

grant MAINTAIN on table public.price_disputes to authenticated;

grant MAINTAIN on table public.price_disputes to service_role;

grant MAINTAIN on table public.profiles to anon;

grant MAINTAIN on table public.profiles to authenticated;

grant MAINTAIN on table public.profiles to service_role;

grant MAINTAIN on table public.rate_limit_buckets to anon;

grant MAINTAIN on table public.rate_limit_buckets to authenticated;

grant MAINTAIN on table public.rate_limit_buckets to service_role;

grant MAINTAIN on table public.reconciliation_exceptions to anon;

grant MAINTAIN on table public.reconciliation_exceptions to authenticated;

grant MAINTAIN on table public.reconciliation_exceptions to service_role;

grant MAINTAIN on table public.report_exports to anon;

grant MAINTAIN on table public.report_exports to authenticated;

grant MAINTAIN on table public.report_exports to service_role;

grant MAINTAIN on table public.resources to anon;

grant MAINTAIN on table public.resources to authenticated;

grant MAINTAIN on table public.resources to service_role;

grant MAINTAIN on table public.reviews to anon;

grant MAINTAIN on table public.reviews to authenticated;

grant MAINTAIN on table public.reviews to service_role;

grant MAINTAIN on table public.settlement_periods to anon;

grant MAINTAIN on table public.settlement_periods to authenticated;

grant MAINTAIN on table public.settlement_periods to service_role;

grant MAINTAIN on table public.support_conversations to anon;

grant MAINTAIN on table public.support_conversations to authenticated;

grant MAINTAIN on table public.support_conversations to service_role;

grant MAINTAIN on table public.support_knowledge_articles to anon;

grant MAINTAIN on table public.support_knowledge_articles to authenticated;

grant MAINTAIN on table public.support_knowledge_articles to service_role;

grant MAINTAIN on table public.support_messages to anon;

grant MAINTAIN on table public.support_messages to authenticated;

grant MAINTAIN on table public.support_messages to service_role;

grant MAINTAIN on table public.suspensions to anon;

grant MAINTAIN on table public.suspensions to authenticated;

grant MAINTAIN on table public.suspensions to service_role;

grant MAINTAIN on table public.treatment_catalog to anon;

grant MAINTAIN on table public.treatment_catalog to authenticated;

grant MAINTAIN on table public.treatment_catalog to service_role;

grant MAINTAIN on table public.treatment_variants to anon;

grant MAINTAIN on table public.treatment_variants to authenticated;

grant MAINTAIN on table public.treatment_variants to service_role;

grant MAINTAIN on table public.verification_records to anon;

grant MAINTAIN on table public.verification_records to authenticated;

grant MAINTAIN on table public.verification_records to service_role;

grant REFERENCES on table public.account_usernames to anon;

grant REFERENCES on table public.account_usernames to authenticated;

grant REFERENCES on table public.account_usernames to service_role;

grant REFERENCES on table public.accounting_journal_lines to anon;

grant REFERENCES on table public.accounting_journal_lines to authenticated;

grant REFERENCES on table public.accounting_journal_lines to service_role;

grant REFERENCES on table public.accounting_journals to anon;

grant REFERENCES on table public.accounting_journals to authenticated;

grant REFERENCES on table public.accounting_journals to service_role;

grant REFERENCES on table public.audit_events to anon;

grant REFERENCES on table public.audit_events to authenticated;

grant REFERENCES on table public.audit_events to service_role;

grant REFERENCES on table public.availability_slots to anon;

grant REFERENCES on table public.availability_slots to authenticated;

grant REFERENCES on table public.availability_slots to service_role;

grant REFERENCES on table public.booking_attendance_events to anon;

grant REFERENCES on table public.booking_attendance_events to authenticated;

grant REFERENCES on table public.booking_attendance_events to service_role;

grant REFERENCES on table public.booking_status_history to anon;

grant REFERENCES on table public.booking_status_history to authenticated;

grant REFERENCES on table public.booking_status_history to service_role;

grant REFERENCES on table public.bookings to anon;

grant REFERENCES on table public.bookings to authenticated;

grant REFERENCES on table public.bookings to service_role;

grant REFERENCES on table public.branch_hour_exceptions to anon;

grant REFERENCES on table public.branch_hour_exceptions to authenticated;

grant REFERENCES on table public.branch_hour_exceptions to service_role;

grant REFERENCES on table public.branch_hours to anon;

grant REFERENCES on table public.branch_hours to authenticated;

grant REFERENCES on table public.branch_hours to service_role;

grant REFERENCES on table public.branch_service_offers to anon;

grant REFERENCES on table public.branch_service_offers to authenticated;

grant REFERENCES on table public.branch_service_offers to service_role;

grant REFERENCES on table public.branches to anon;

grant REFERENCES on table public.branches to authenticated;

grant REFERENCES on table public.branches to service_role;

grant REFERENCES on table public.clinic_fee_rules to anon;

grant REFERENCES on table public.clinic_fee_rules to authenticated;

grant REFERENCES on table public.clinic_fee_rules to service_role;

grant REFERENCES on table public.clinic_memberships to anon;

grant REFERENCES on table public.clinic_memberships to authenticated;

grant REFERENCES on table public.clinic_memberships to service_role;

grant REFERENCES on table public.clinic_operator_account_events to anon;

grant REFERENCES on table public.clinic_operator_account_events to authenticated;

grant REFERENCES on table public.clinic_operator_account_events to service_role;

grant REFERENCES on table public.clinic_operator_accounts to anon;

grant REFERENCES on table public.clinic_operator_accounts to authenticated;

grant REFERENCES on table public.clinic_operator_accounts to service_role;

grant REFERENCES on table public.clinics to anon;

grant REFERENCES on table public.clinics to authenticated;

grant REFERENCES on table public.clinics to service_role;

grant REFERENCES on table public.consent_records to anon;

grant REFERENCES on table public.consent_records to authenticated;

grant REFERENCES on table public.consent_records to service_role;

grant REFERENCES on table public.customer_choice_events to anon;

grant REFERENCES on table public.customer_choice_events to authenticated;

grant REFERENCES on table public.customer_choice_events to service_role;

grant REFERENCES on table public.device_installations to anon;

grant REFERENCES on table public.device_installations to authenticated;

grant REFERENCES on table public.device_installations to service_role;

grant REFERENCES on table public.feature_flags to anon;

grant REFERENCES on table public.feature_flags to authenticated;

grant REFERENCES on table public.feature_flags to service_role;

grant REFERENCES on table public.idempotency_keys to anon;

grant REFERENCES on table public.idempotency_keys to authenticated;

grant REFERENCES on table public.idempotency_keys to service_role;

grant REFERENCES on table public.instant_slots to anon;

grant REFERENCES on table public.instant_slots to authenticated;

grant REFERENCES on table public.instant_slots to service_role;

grant REFERENCES on table public.notification_delivery_attempts to anon;

grant REFERENCES on table public.notification_delivery_attempts to authenticated;

grant REFERENCES on table public.notification_delivery_attempts to service_role;

grant REFERENCES on table public.notification_outbox to anon;

grant REFERENCES on table public.notification_outbox to authenticated;

grant REFERENCES on table public.notification_outbox to service_role;

grant REFERENCES on table public.notification_preferences to anon;

grant REFERENCES on table public.notification_preferences to authenticated;

grant REFERENCES on table public.notification_preferences to service_role;

grant REFERENCES on table public.notification_subscriptions to anon;

grant REFERENCES on table public.notification_subscriptions to authenticated;

grant REFERENCES on table public.notification_subscriptions to service_role;

grant REFERENCES on table public.notification_templates to anon;

grant REFERENCES on table public.notification_templates to authenticated;

grant REFERENCES on table public.notification_templates to service_role;

grant REFERENCES on table public.offer_revisions to anon;

grant REFERENCES on table public.offer_revisions to authenticated;

grant REFERENCES on table public.offer_revisions to service_role;

grant REFERENCES on table public.patient_phone_verification_challenges to anon;

grant REFERENCES on table public.patient_phone_verification_challenges to authenticated;

grant REFERENCES on table public.patient_phone_verification_challenges to service_role;

grant REFERENCES on table public.patient_profiles to anon;

grant REFERENCES on table public.patient_profiles to authenticated;

grant REFERENCES on table public.patient_profiles to service_role;

grant REFERENCES on table public.payment_events to anon;

grant REFERENCES on table public.payment_events to authenticated;

grant REFERENCES on table public.payment_events to service_role;

grant REFERENCES on table public.payment_intents to anon;

grant REFERENCES on table public.payment_intents to authenticated;

grant REFERENCES on table public.payment_intents to service_role;

grant REFERENCES on table public.practitioners to anon;

grant REFERENCES on table public.practitioners to authenticated;

grant REFERENCES on table public.practitioners to service_role;

grant REFERENCES on table public.price_disputes to anon;

grant REFERENCES on table public.price_disputes to authenticated;

grant REFERENCES on table public.price_disputes to service_role;

grant REFERENCES on table public.profiles to anon;

grant REFERENCES on table public.profiles to authenticated;

grant REFERENCES on table public.profiles to service_role;

grant REFERENCES on table public.rate_limit_buckets to anon;

grant REFERENCES on table public.rate_limit_buckets to authenticated;

grant REFERENCES on table public.rate_limit_buckets to service_role;

grant REFERENCES on table public.reconciliation_exceptions to anon;

grant REFERENCES on table public.reconciliation_exceptions to authenticated;

grant REFERENCES on table public.reconciliation_exceptions to service_role;

grant REFERENCES on table public.report_exports to anon;

grant REFERENCES on table public.report_exports to authenticated;

grant REFERENCES on table public.report_exports to service_role;

grant REFERENCES on table public.resources to anon;

grant REFERENCES on table public.resources to authenticated;

grant REFERENCES on table public.resources to service_role;

grant REFERENCES on table public.reviews to anon;

grant REFERENCES on table public.reviews to authenticated;

grant REFERENCES on table public.reviews to service_role;

grant REFERENCES on table public.settlement_periods to anon;

grant REFERENCES on table public.settlement_periods to authenticated;

grant REFERENCES on table public.settlement_periods to service_role;

grant REFERENCES on table public.support_conversations to anon;

grant REFERENCES on table public.support_conversations to authenticated;

grant REFERENCES on table public.support_conversations to service_role;

grant REFERENCES on table public.support_knowledge_articles to anon;

grant REFERENCES on table public.support_knowledge_articles to authenticated;

grant REFERENCES on table public.support_knowledge_articles to service_role;

grant REFERENCES on table public.support_messages to anon;

grant REFERENCES on table public.support_messages to authenticated;

grant REFERENCES on table public.support_messages to service_role;

grant REFERENCES on table public.suspensions to anon;

grant REFERENCES on table public.suspensions to authenticated;

grant REFERENCES on table public.suspensions to service_role;

grant REFERENCES on table public.treatment_catalog to anon;

grant REFERENCES on table public.treatment_catalog to authenticated;

grant REFERENCES on table public.treatment_catalog to service_role;

grant REFERENCES on table public.treatment_variants to anon;

grant REFERENCES on table public.treatment_variants to authenticated;

grant REFERENCES on table public.treatment_variants to service_role;

grant REFERENCES on table public.verification_records to anon;

grant REFERENCES on table public.verification_records to authenticated;

grant REFERENCES on table public.verification_records to service_role;

grant SELECT on sequence public.audit_events_id_seq to anon;

grant SELECT on sequence public.audit_events_id_seq to authenticated;

grant SELECT on sequence public.audit_events_id_seq to service_role;

grant SELECT on sequence public.booking_status_history_id_seq to anon;

grant SELECT on sequence public.booking_status_history_id_seq to authenticated;

grant SELECT on sequence public.booking_status_history_id_seq to service_role;

grant SELECT on sequence public.payment_events_id_seq to anon;

grant SELECT on sequence public.payment_events_id_seq to authenticated;

grant SELECT on sequence public.payment_events_id_seq to service_role;

grant SELECT on table public.account_usernames to anon;

grant SELECT on table public.account_usernames to authenticated;

grant SELECT on table public.account_usernames to service_role;

grant SELECT on table public.accounting_journal_lines to anon;

grant SELECT on table public.accounting_journal_lines to authenticated;

grant SELECT on table public.accounting_journal_lines to service_role;

grant SELECT on table public.accounting_journals to anon;

grant SELECT on table public.accounting_journals to authenticated;

grant SELECT on table public.accounting_journals to service_role;

grant SELECT on table public.audit_events to anon;

grant SELECT on table public.audit_events to authenticated;

grant SELECT on table public.audit_events to service_role;

grant SELECT on table public.availability_slots to anon;

grant SELECT on table public.availability_slots to authenticated;

grant SELECT on table public.availability_slots to service_role;

grant SELECT on table public.booking_attendance_events to anon;

grant SELECT on table public.booking_attendance_events to authenticated;

grant SELECT on table public.booking_attendance_events to service_role;

grant SELECT on table public.booking_status_history to anon;

grant SELECT on table public.booking_status_history to authenticated;

grant SELECT on table public.booking_status_history to service_role;

grant SELECT on table public.bookings to anon;

grant SELECT on table public.bookings to authenticated;

grant SELECT on table public.bookings to service_role;

grant SELECT on table public.branch_hour_exceptions to anon;

grant SELECT on table public.branch_hour_exceptions to authenticated;

grant SELECT on table public.branch_hour_exceptions to service_role;

grant SELECT on table public.branch_hours to anon;

grant SELECT on table public.branch_hours to authenticated;

grant SELECT on table public.branch_hours to service_role;

grant SELECT on table public.branch_service_offers to anon;

grant SELECT on table public.branch_service_offers to authenticated;

grant SELECT on table public.branch_service_offers to service_role;

grant SELECT on table public.branches to anon;

grant SELECT on table public.branches to authenticated;

grant SELECT on table public.branches to service_role;

grant SELECT on table public.clinic_fee_rules to anon;

grant SELECT on table public.clinic_fee_rules to authenticated;

grant SELECT on table public.clinic_fee_rules to service_role;

grant SELECT on table public.clinic_memberships to anon;

grant SELECT on table public.clinic_memberships to authenticated;

grant SELECT on table public.clinic_memberships to service_role;

grant SELECT on table public.clinic_operator_account_events to anon;

grant SELECT on table public.clinic_operator_account_events to authenticated;

grant SELECT on table public.clinic_operator_account_events to service_role;

grant SELECT on table public.clinic_operator_accounts to anon;

grant SELECT on table public.clinic_operator_accounts to authenticated;

grant SELECT on table public.clinic_operator_accounts to service_role;

grant SELECT on table public.clinics to anon;

grant SELECT on table public.clinics to authenticated;

grant SELECT on table public.clinics to service_role;

grant SELECT on table public.consent_records to anon;

grant SELECT on table public.consent_records to authenticated;

grant SELECT on table public.consent_records to service_role;

grant SELECT on table public.customer_choice_events to anon;

grant SELECT on table public.customer_choice_events to authenticated;

grant SELECT on table public.customer_choice_events to service_role;

grant SELECT on table public.device_installations to anon;

grant SELECT on table public.device_installations to authenticated;

grant SELECT on table public.device_installations to service_role;

grant SELECT on table public.feature_flags to anon;

grant SELECT on table public.feature_flags to authenticated;

grant SELECT on table public.feature_flags to service_role;

grant SELECT on table public.idempotency_keys to anon;

grant SELECT on table public.idempotency_keys to authenticated;

grant SELECT on table public.idempotency_keys to service_role;

grant SELECT on table public.instant_slots to anon;

grant SELECT on table public.instant_slots to authenticated;

grant SELECT on table public.instant_slots to service_role;

grant SELECT on table public.notification_delivery_attempts to anon;

grant SELECT on table public.notification_delivery_attempts to authenticated;

grant SELECT on table public.notification_delivery_attempts to service_role;

grant SELECT on table public.notification_outbox to anon;

grant SELECT on table public.notification_outbox to authenticated;

grant SELECT on table public.notification_outbox to service_role;

grant SELECT on table public.notification_preferences to anon;

grant SELECT on table public.notification_preferences to authenticated;

grant SELECT on table public.notification_preferences to service_role;

grant SELECT on table public.notification_subscriptions to anon;

grant SELECT on table public.notification_subscriptions to authenticated;

grant SELECT on table public.notification_subscriptions to service_role;

grant SELECT on table public.notification_templates to anon;

grant SELECT on table public.notification_templates to authenticated;

grant SELECT on table public.notification_templates to service_role;

grant SELECT on table public.offer_revisions to anon;

grant SELECT on table public.offer_revisions to authenticated;

grant SELECT on table public.offer_revisions to service_role;

grant SELECT on table public.patient_phone_verification_challenges to anon;

grant SELECT on table public.patient_phone_verification_challenges to authenticated;

grant SELECT on table public.patient_phone_verification_challenges to service_role;

grant SELECT on table public.patient_profiles to anon;

grant SELECT on table public.patient_profiles to authenticated;

grant SELECT on table public.patient_profiles to service_role;

grant SELECT on table public.payment_events to anon;

grant SELECT on table public.payment_events to authenticated;

grant SELECT on table public.payment_events to service_role;

grant SELECT on table public.payment_intents to anon;

grant SELECT on table public.payment_intents to authenticated;

grant SELECT on table public.payment_intents to service_role;

grant SELECT on table public.practitioners to anon;

grant SELECT on table public.practitioners to authenticated;

grant SELECT on table public.practitioners to service_role;

grant SELECT on table public.price_disputes to anon;

grant SELECT on table public.price_disputes to authenticated;

grant SELECT on table public.price_disputes to service_role;

grant SELECT on table public.profiles to anon;

grant SELECT on table public.profiles to authenticated;

grant SELECT on table public.profiles to service_role;

grant SELECT on table public.rate_limit_buckets to anon;

grant SELECT on table public.rate_limit_buckets to authenticated;

grant SELECT on table public.rate_limit_buckets to service_role;

grant SELECT on table public.reconciliation_exceptions to anon;

grant SELECT on table public.reconciliation_exceptions to authenticated;

grant SELECT on table public.reconciliation_exceptions to service_role;

grant SELECT on table public.report_exports to anon;

grant SELECT on table public.report_exports to authenticated;

grant SELECT on table public.report_exports to service_role;

grant SELECT on table public.resources to anon;

grant SELECT on table public.resources to authenticated;

grant SELECT on table public.resources to service_role;

grant SELECT on table public.reviews to anon;

grant SELECT on table public.reviews to authenticated;

grant SELECT on table public.reviews to service_role;

grant SELECT on table public.settlement_periods to anon;

grant SELECT on table public.settlement_periods to authenticated;

grant SELECT on table public.settlement_periods to service_role;

grant SELECT on table public.support_conversations to anon;

grant SELECT on table public.support_conversations to authenticated;

grant SELECT on table public.support_conversations to service_role;

grant SELECT on table public.support_knowledge_articles to anon;

grant SELECT on table public.support_knowledge_articles to authenticated;

grant SELECT on table public.support_knowledge_articles to service_role;

grant SELECT on table public.support_messages to anon;

grant SELECT on table public.support_messages to authenticated;

grant SELECT on table public.support_messages to service_role;

grant SELECT on table public.suspensions to anon;

grant SELECT on table public.suspensions to authenticated;

grant SELECT on table public.suspensions to service_role;

grant SELECT on table public.treatment_catalog to anon;

grant SELECT on table public.treatment_catalog to authenticated;

grant SELECT on table public.treatment_catalog to service_role;

grant SELECT on table public.treatment_variants to anon;

grant SELECT on table public.treatment_variants to authenticated;

grant SELECT on table public.treatment_variants to service_role;

grant SELECT on table public.verification_records to anon;

grant SELECT on table public.verification_records to authenticated;

grant SELECT on table public.verification_records to service_role;

grant TRIGGER on table public.account_usernames to anon;

grant TRIGGER on table public.account_usernames to authenticated;

grant TRIGGER on table public.account_usernames to service_role;

grant TRIGGER on table public.accounting_journal_lines to anon;

grant TRIGGER on table public.accounting_journal_lines to authenticated;

grant TRIGGER on table public.accounting_journal_lines to service_role;

grant TRIGGER on table public.accounting_journals to anon;

grant TRIGGER on table public.accounting_journals to authenticated;

grant TRIGGER on table public.accounting_journals to service_role;

grant TRIGGER on table public.audit_events to anon;

grant TRIGGER on table public.audit_events to authenticated;

grant TRIGGER on table public.audit_events to service_role;

grant TRIGGER on table public.availability_slots to anon;

grant TRIGGER on table public.availability_slots to authenticated;

grant TRIGGER on table public.availability_slots to service_role;

grant TRIGGER on table public.booking_attendance_events to anon;

grant TRIGGER on table public.booking_attendance_events to authenticated;

grant TRIGGER on table public.booking_attendance_events to service_role;

grant TRIGGER on table public.booking_status_history to anon;

grant TRIGGER on table public.booking_status_history to authenticated;

grant TRIGGER on table public.booking_status_history to service_role;

grant TRIGGER on table public.bookings to anon;

grant TRIGGER on table public.bookings to authenticated;

grant TRIGGER on table public.bookings to service_role;

grant TRIGGER on table public.branch_hour_exceptions to anon;

grant TRIGGER on table public.branch_hour_exceptions to authenticated;

grant TRIGGER on table public.branch_hour_exceptions to service_role;

grant TRIGGER on table public.branch_hours to anon;

grant TRIGGER on table public.branch_hours to authenticated;

grant TRIGGER on table public.branch_hours to service_role;

grant TRIGGER on table public.branch_service_offers to anon;

grant TRIGGER on table public.branch_service_offers to authenticated;

grant TRIGGER on table public.branch_service_offers to service_role;

grant TRIGGER on table public.branches to anon;

grant TRIGGER on table public.branches to authenticated;

grant TRIGGER on table public.branches to service_role;

grant TRIGGER on table public.clinic_fee_rules to anon;

grant TRIGGER on table public.clinic_fee_rules to authenticated;

grant TRIGGER on table public.clinic_fee_rules to service_role;

grant TRIGGER on table public.clinic_memberships to anon;

grant TRIGGER on table public.clinic_memberships to authenticated;

grant TRIGGER on table public.clinic_memberships to service_role;

grant TRIGGER on table public.clinic_operator_account_events to anon;

grant TRIGGER on table public.clinic_operator_account_events to authenticated;

grant TRIGGER on table public.clinic_operator_account_events to service_role;

grant TRIGGER on table public.clinic_operator_accounts to anon;

grant TRIGGER on table public.clinic_operator_accounts to authenticated;

grant TRIGGER on table public.clinic_operator_accounts to service_role;

grant TRIGGER on table public.clinics to anon;

grant TRIGGER on table public.clinics to authenticated;

grant TRIGGER on table public.clinics to service_role;

grant TRIGGER on table public.consent_records to anon;

grant TRIGGER on table public.consent_records to authenticated;

grant TRIGGER on table public.consent_records to service_role;

grant TRIGGER on table public.customer_choice_events to anon;

grant TRIGGER on table public.customer_choice_events to authenticated;

grant TRIGGER on table public.customer_choice_events to service_role;

grant TRIGGER on table public.device_installations to anon;

grant TRIGGER on table public.device_installations to authenticated;

grant TRIGGER on table public.device_installations to service_role;

grant TRIGGER on table public.feature_flags to anon;

grant TRIGGER on table public.feature_flags to authenticated;

grant TRIGGER on table public.feature_flags to service_role;

grant TRIGGER on table public.idempotency_keys to anon;

grant TRIGGER on table public.idempotency_keys to authenticated;

grant TRIGGER on table public.idempotency_keys to service_role;

grant TRIGGER on table public.instant_slots to anon;

grant TRIGGER on table public.instant_slots to authenticated;

grant TRIGGER on table public.instant_slots to service_role;

grant TRIGGER on table public.notification_delivery_attempts to anon;

grant TRIGGER on table public.notification_delivery_attempts to authenticated;

grant TRIGGER on table public.notification_delivery_attempts to service_role;

grant TRIGGER on table public.notification_outbox to anon;

grant TRIGGER on table public.notification_outbox to authenticated;

grant TRIGGER on table public.notification_outbox to service_role;

grant TRIGGER on table public.notification_preferences to anon;

grant TRIGGER on table public.notification_preferences to authenticated;

grant TRIGGER on table public.notification_preferences to service_role;

grant TRIGGER on table public.notification_subscriptions to anon;

grant TRIGGER on table public.notification_subscriptions to authenticated;

grant TRIGGER on table public.notification_subscriptions to service_role;

grant TRIGGER on table public.notification_templates to anon;

grant TRIGGER on table public.notification_templates to authenticated;

grant TRIGGER on table public.notification_templates to service_role;

grant TRIGGER on table public.offer_revisions to anon;

grant TRIGGER on table public.offer_revisions to authenticated;

grant TRIGGER on table public.offer_revisions to service_role;

grant TRIGGER on table public.patient_phone_verification_challenges to anon;

grant TRIGGER on table public.patient_phone_verification_challenges to authenticated;

grant TRIGGER on table public.patient_phone_verification_challenges to service_role;

grant TRIGGER on table public.patient_profiles to anon;

grant TRIGGER on table public.patient_profiles to authenticated;

grant TRIGGER on table public.patient_profiles to service_role;

grant TRIGGER on table public.payment_events to anon;

grant TRIGGER on table public.payment_events to authenticated;

grant TRIGGER on table public.payment_events to service_role;

grant TRIGGER on table public.payment_intents to anon;

grant TRIGGER on table public.payment_intents to authenticated;

grant TRIGGER on table public.payment_intents to service_role;

grant TRIGGER on table public.practitioners to anon;

grant TRIGGER on table public.practitioners to authenticated;

grant TRIGGER on table public.practitioners to service_role;

grant TRIGGER on table public.price_disputes to anon;

grant TRIGGER on table public.price_disputes to authenticated;

grant TRIGGER on table public.price_disputes to service_role;

grant TRIGGER on table public.profiles to anon;

grant TRIGGER on table public.profiles to authenticated;

grant TRIGGER on table public.profiles to service_role;

grant TRIGGER on table public.rate_limit_buckets to anon;

grant TRIGGER on table public.rate_limit_buckets to authenticated;

grant TRIGGER on table public.rate_limit_buckets to service_role;

grant TRIGGER on table public.reconciliation_exceptions to anon;

grant TRIGGER on table public.reconciliation_exceptions to authenticated;

grant TRIGGER on table public.reconciliation_exceptions to service_role;

grant TRIGGER on table public.report_exports to anon;

grant TRIGGER on table public.report_exports to authenticated;

grant TRIGGER on table public.report_exports to service_role;

grant TRIGGER on table public.resources to anon;

grant TRIGGER on table public.resources to authenticated;

grant TRIGGER on table public.resources to service_role;

grant TRIGGER on table public.reviews to anon;

grant TRIGGER on table public.reviews to authenticated;

grant TRIGGER on table public.reviews to service_role;

grant TRIGGER on table public.settlement_periods to anon;

grant TRIGGER on table public.settlement_periods to authenticated;

grant TRIGGER on table public.settlement_periods to service_role;

grant TRIGGER on table public.support_conversations to anon;

grant TRIGGER on table public.support_conversations to authenticated;

grant TRIGGER on table public.support_conversations to service_role;

grant TRIGGER on table public.support_knowledge_articles to anon;

grant TRIGGER on table public.support_knowledge_articles to authenticated;

grant TRIGGER on table public.support_knowledge_articles to service_role;

grant TRIGGER on table public.support_messages to anon;

grant TRIGGER on table public.support_messages to authenticated;

grant TRIGGER on table public.support_messages to service_role;

grant TRIGGER on table public.suspensions to anon;

grant TRIGGER on table public.suspensions to authenticated;

grant TRIGGER on table public.suspensions to service_role;

grant TRIGGER on table public.treatment_catalog to anon;

grant TRIGGER on table public.treatment_catalog to authenticated;

grant TRIGGER on table public.treatment_catalog to service_role;

grant TRIGGER on table public.treatment_variants to anon;

grant TRIGGER on table public.treatment_variants to authenticated;

grant TRIGGER on table public.treatment_variants to service_role;

grant TRIGGER on table public.verification_records to anon;

grant TRIGGER on table public.verification_records to authenticated;

grant TRIGGER on table public.verification_records to service_role;

grant TRUNCATE on table public.account_usernames to anon;

grant TRUNCATE on table public.account_usernames to authenticated;

grant TRUNCATE on table public.account_usernames to service_role;

grant TRUNCATE on table public.accounting_journal_lines to anon;

grant TRUNCATE on table public.accounting_journal_lines to authenticated;

grant TRUNCATE on table public.accounting_journal_lines to service_role;

grant TRUNCATE on table public.accounting_journals to anon;

grant TRUNCATE on table public.accounting_journals to authenticated;

grant TRUNCATE on table public.accounting_journals to service_role;

grant TRUNCATE on table public.audit_events to anon;

grant TRUNCATE on table public.audit_events to authenticated;

grant TRUNCATE on table public.audit_events to service_role;

grant TRUNCATE on table public.availability_slots to anon;

grant TRUNCATE on table public.availability_slots to authenticated;

grant TRUNCATE on table public.availability_slots to service_role;

grant TRUNCATE on table public.booking_attendance_events to anon;

grant TRUNCATE on table public.booking_attendance_events to authenticated;

grant TRUNCATE on table public.booking_attendance_events to service_role;

grant TRUNCATE on table public.booking_status_history to anon;

grant TRUNCATE on table public.booking_status_history to authenticated;

grant TRUNCATE on table public.booking_status_history to service_role;

grant TRUNCATE on table public.bookings to anon;

grant TRUNCATE on table public.bookings to authenticated;

grant TRUNCATE on table public.bookings to service_role;

grant TRUNCATE on table public.branch_hour_exceptions to anon;

grant TRUNCATE on table public.branch_hour_exceptions to authenticated;

grant TRUNCATE on table public.branch_hour_exceptions to service_role;

grant TRUNCATE on table public.branch_hours to anon;

grant TRUNCATE on table public.branch_hours to authenticated;

grant TRUNCATE on table public.branch_hours to service_role;

grant TRUNCATE on table public.branch_service_offers to anon;

grant TRUNCATE on table public.branch_service_offers to authenticated;

grant TRUNCATE on table public.branch_service_offers to service_role;

grant TRUNCATE on table public.branches to anon;

grant TRUNCATE on table public.branches to authenticated;

grant TRUNCATE on table public.branches to service_role;

grant TRUNCATE on table public.clinic_fee_rules to anon;

grant TRUNCATE on table public.clinic_fee_rules to authenticated;

grant TRUNCATE on table public.clinic_fee_rules to service_role;

grant TRUNCATE on table public.clinic_memberships to anon;

grant TRUNCATE on table public.clinic_memberships to authenticated;

grant TRUNCATE on table public.clinic_memberships to service_role;

grant TRUNCATE on table public.clinic_operator_account_events to anon;

grant TRUNCATE on table public.clinic_operator_account_events to authenticated;

grant TRUNCATE on table public.clinic_operator_account_events to service_role;

grant TRUNCATE on table public.clinic_operator_accounts to anon;

grant TRUNCATE on table public.clinic_operator_accounts to authenticated;

grant TRUNCATE on table public.clinic_operator_accounts to service_role;

grant TRUNCATE on table public.clinics to anon;

grant TRUNCATE on table public.clinics to authenticated;

grant TRUNCATE on table public.clinics to service_role;

grant TRUNCATE on table public.consent_records to anon;

grant TRUNCATE on table public.consent_records to authenticated;

grant TRUNCATE on table public.consent_records to service_role;

grant TRUNCATE on table public.customer_choice_events to anon;

grant TRUNCATE on table public.customer_choice_events to authenticated;

grant TRUNCATE on table public.customer_choice_events to service_role;

grant TRUNCATE on table public.device_installations to anon;

grant TRUNCATE on table public.device_installations to authenticated;

grant TRUNCATE on table public.device_installations to service_role;

grant TRUNCATE on table public.feature_flags to anon;

grant TRUNCATE on table public.feature_flags to authenticated;

grant TRUNCATE on table public.feature_flags to service_role;

grant TRUNCATE on table public.idempotency_keys to anon;

grant TRUNCATE on table public.idempotency_keys to authenticated;

grant TRUNCATE on table public.idempotency_keys to service_role;

grant TRUNCATE on table public.instant_slots to anon;

grant TRUNCATE on table public.instant_slots to authenticated;

grant TRUNCATE on table public.instant_slots to service_role;

grant TRUNCATE on table public.notification_delivery_attempts to anon;

grant TRUNCATE on table public.notification_delivery_attempts to authenticated;

grant TRUNCATE on table public.notification_delivery_attempts to service_role;

grant TRUNCATE on table public.notification_outbox to anon;

grant TRUNCATE on table public.notification_outbox to authenticated;

grant TRUNCATE on table public.notification_outbox to service_role;

grant TRUNCATE on table public.notification_preferences to anon;

grant TRUNCATE on table public.notification_preferences to authenticated;

grant TRUNCATE on table public.notification_preferences to service_role;

grant TRUNCATE on table public.notification_subscriptions to anon;

grant TRUNCATE on table public.notification_subscriptions to authenticated;

grant TRUNCATE on table public.notification_subscriptions to service_role;

grant TRUNCATE on table public.notification_templates to anon;

grant TRUNCATE on table public.notification_templates to authenticated;

grant TRUNCATE on table public.notification_templates to service_role;

grant TRUNCATE on table public.offer_revisions to anon;

grant TRUNCATE on table public.offer_revisions to authenticated;

grant TRUNCATE on table public.offer_revisions to service_role;

grant TRUNCATE on table public.patient_phone_verification_challenges to anon;

grant TRUNCATE on table public.patient_phone_verification_challenges to authenticated;

grant TRUNCATE on table public.patient_phone_verification_challenges to service_role;

grant TRUNCATE on table public.patient_profiles to anon;

grant TRUNCATE on table public.patient_profiles to authenticated;

grant TRUNCATE on table public.patient_profiles to service_role;

grant TRUNCATE on table public.payment_events to anon;

grant TRUNCATE on table public.payment_events to authenticated;

grant TRUNCATE on table public.payment_events to service_role;

grant TRUNCATE on table public.payment_intents to anon;

grant TRUNCATE on table public.payment_intents to authenticated;

grant TRUNCATE on table public.payment_intents to service_role;

grant TRUNCATE on table public.practitioners to anon;

grant TRUNCATE on table public.practitioners to authenticated;

grant TRUNCATE on table public.practitioners to service_role;

grant TRUNCATE on table public.price_disputes to anon;

grant TRUNCATE on table public.price_disputes to authenticated;

grant TRUNCATE on table public.price_disputes to service_role;

grant TRUNCATE on table public.profiles to anon;

grant TRUNCATE on table public.profiles to authenticated;

grant TRUNCATE on table public.profiles to service_role;

grant TRUNCATE on table public.rate_limit_buckets to anon;

grant TRUNCATE on table public.rate_limit_buckets to authenticated;

grant TRUNCATE on table public.rate_limit_buckets to service_role;

grant TRUNCATE on table public.reconciliation_exceptions to anon;

grant TRUNCATE on table public.reconciliation_exceptions to authenticated;

grant TRUNCATE on table public.reconciliation_exceptions to service_role;

grant TRUNCATE on table public.report_exports to anon;

grant TRUNCATE on table public.report_exports to authenticated;

grant TRUNCATE on table public.report_exports to service_role;

grant TRUNCATE on table public.resources to anon;

grant TRUNCATE on table public.resources to authenticated;

grant TRUNCATE on table public.resources to service_role;

grant TRUNCATE on table public.reviews to anon;

grant TRUNCATE on table public.reviews to authenticated;

grant TRUNCATE on table public.reviews to service_role;

grant TRUNCATE on table public.settlement_periods to anon;

grant TRUNCATE on table public.settlement_periods to authenticated;

grant TRUNCATE on table public.settlement_periods to service_role;

grant TRUNCATE on table public.support_conversations to anon;

grant TRUNCATE on table public.support_conversations to authenticated;

grant TRUNCATE on table public.support_conversations to service_role;

grant TRUNCATE on table public.support_knowledge_articles to anon;

grant TRUNCATE on table public.support_knowledge_articles to authenticated;

grant TRUNCATE on table public.support_knowledge_articles to service_role;

grant TRUNCATE on table public.support_messages to anon;

grant TRUNCATE on table public.support_messages to authenticated;

grant TRUNCATE on table public.support_messages to service_role;

grant TRUNCATE on table public.suspensions to anon;

grant TRUNCATE on table public.suspensions to authenticated;

grant TRUNCATE on table public.suspensions to service_role;

grant TRUNCATE on table public.treatment_catalog to anon;

grant TRUNCATE on table public.treatment_catalog to authenticated;

grant TRUNCATE on table public.treatment_catalog to service_role;

grant TRUNCATE on table public.treatment_variants to anon;

grant TRUNCATE on table public.treatment_variants to authenticated;

grant TRUNCATE on table public.treatment_variants to service_role;

grant TRUNCATE on table public.verification_records to anon;

grant TRUNCATE on table public.verification_records to authenticated;

grant TRUNCATE on table public.verification_records to service_role;

grant UPDATE on sequence public.audit_events_id_seq to anon;

grant UPDATE on sequence public.audit_events_id_seq to authenticated;

grant UPDATE on sequence public.audit_events_id_seq to service_role;

grant UPDATE on sequence public.booking_status_history_id_seq to anon;

grant UPDATE on sequence public.booking_status_history_id_seq to authenticated;

grant UPDATE on sequence public.booking_status_history_id_seq to service_role;

grant UPDATE on sequence public.payment_events_id_seq to anon;

grant UPDATE on sequence public.payment_events_id_seq to authenticated;

grant UPDATE on sequence public.payment_events_id_seq to service_role;

grant UPDATE on table public.account_usernames to anon;

grant UPDATE on table public.account_usernames to authenticated;

grant UPDATE on table public.account_usernames to service_role;

grant UPDATE on table public.accounting_journal_lines to anon;

grant UPDATE on table public.accounting_journal_lines to authenticated;

grant UPDATE on table public.accounting_journal_lines to service_role;

grant UPDATE on table public.accounting_journals to anon;

grant UPDATE on table public.accounting_journals to authenticated;

grant UPDATE on table public.accounting_journals to service_role;

grant UPDATE on table public.audit_events to anon;

grant UPDATE on table public.audit_events to authenticated;

grant UPDATE on table public.audit_events to service_role;

grant UPDATE on table public.availability_slots to anon;

grant UPDATE on table public.availability_slots to authenticated;

grant UPDATE on table public.availability_slots to service_role;

grant UPDATE on table public.booking_attendance_events to anon;

grant UPDATE on table public.booking_attendance_events to authenticated;

grant UPDATE on table public.booking_attendance_events to service_role;

grant UPDATE on table public.booking_status_history to anon;

grant UPDATE on table public.booking_status_history to authenticated;

grant UPDATE on table public.booking_status_history to service_role;

grant UPDATE on table public.bookings to anon;

grant UPDATE on table public.bookings to authenticated;

grant UPDATE on table public.bookings to service_role;

grant UPDATE on table public.branch_hour_exceptions to anon;

grant UPDATE on table public.branch_hour_exceptions to authenticated;

grant UPDATE on table public.branch_hour_exceptions to service_role;

grant UPDATE on table public.branch_hours to anon;

grant UPDATE on table public.branch_hours to authenticated;

grant UPDATE on table public.branch_hours to service_role;

grant UPDATE on table public.branch_service_offers to anon;

grant UPDATE on table public.branch_service_offers to authenticated;

grant UPDATE on table public.branch_service_offers to service_role;

grant UPDATE on table public.branches to anon;

grant UPDATE on table public.branches to authenticated;

grant UPDATE on table public.branches to service_role;

grant UPDATE on table public.clinic_fee_rules to anon;

grant UPDATE on table public.clinic_fee_rules to authenticated;

grant UPDATE on table public.clinic_fee_rules to service_role;

grant UPDATE on table public.clinic_memberships to anon;

grant UPDATE on table public.clinic_memberships to authenticated;

grant UPDATE on table public.clinic_memberships to service_role;

grant UPDATE on table public.clinic_operator_account_events to anon;

grant UPDATE on table public.clinic_operator_account_events to authenticated;

grant UPDATE on table public.clinic_operator_account_events to service_role;

grant UPDATE on table public.clinic_operator_accounts to anon;

grant UPDATE on table public.clinic_operator_accounts to authenticated;

grant UPDATE on table public.clinic_operator_accounts to service_role;

grant UPDATE on table public.clinics to anon;

grant UPDATE on table public.clinics to authenticated;

grant UPDATE on table public.clinics to service_role;

grant UPDATE on table public.consent_records to anon;

grant UPDATE on table public.consent_records to authenticated;

grant UPDATE on table public.consent_records to service_role;

grant UPDATE on table public.customer_choice_events to anon;

grant UPDATE on table public.customer_choice_events to authenticated;

grant UPDATE on table public.customer_choice_events to service_role;

grant UPDATE on table public.device_installations to anon;

grant UPDATE on table public.device_installations to authenticated;

grant UPDATE on table public.device_installations to service_role;

grant UPDATE on table public.feature_flags to anon;

grant UPDATE on table public.feature_flags to authenticated;

grant UPDATE on table public.feature_flags to service_role;

grant UPDATE on table public.idempotency_keys to anon;

grant UPDATE on table public.idempotency_keys to authenticated;

grant UPDATE on table public.idempotency_keys to service_role;

grant UPDATE on table public.instant_slots to anon;

grant UPDATE on table public.instant_slots to authenticated;

grant UPDATE on table public.instant_slots to service_role;

grant UPDATE on table public.notification_delivery_attempts to anon;

grant UPDATE on table public.notification_delivery_attempts to authenticated;

grant UPDATE on table public.notification_delivery_attempts to service_role;

grant UPDATE on table public.notification_outbox to anon;

grant UPDATE on table public.notification_outbox to authenticated;

grant UPDATE on table public.notification_outbox to service_role;

grant UPDATE on table public.notification_preferences to anon;

grant UPDATE on table public.notification_preferences to authenticated;

grant UPDATE on table public.notification_preferences to service_role;

grant UPDATE on table public.notification_subscriptions to anon;

grant UPDATE on table public.notification_subscriptions to authenticated;

grant UPDATE on table public.notification_subscriptions to service_role;

grant UPDATE on table public.notification_templates to anon;

grant UPDATE on table public.notification_templates to authenticated;

grant UPDATE on table public.notification_templates to service_role;

grant UPDATE on table public.offer_revisions to anon;

grant UPDATE on table public.offer_revisions to authenticated;

grant UPDATE on table public.offer_revisions to service_role;

grant UPDATE on table public.patient_phone_verification_challenges to anon;

grant UPDATE on table public.patient_phone_verification_challenges to authenticated;

grant UPDATE on table public.patient_phone_verification_challenges to service_role;

grant UPDATE on table public.patient_profiles to anon;

grant UPDATE on table public.patient_profiles to authenticated;

grant UPDATE on table public.patient_profiles to service_role;

grant UPDATE on table public.payment_events to anon;

grant UPDATE on table public.payment_events to authenticated;

grant UPDATE on table public.payment_events to service_role;

grant UPDATE on table public.payment_intents to anon;

grant UPDATE on table public.payment_intents to authenticated;

grant UPDATE on table public.payment_intents to service_role;

grant UPDATE on table public.practitioners to anon;

grant UPDATE on table public.practitioners to authenticated;

grant UPDATE on table public.practitioners to service_role;

grant UPDATE on table public.price_disputes to anon;

grant UPDATE on table public.price_disputes to authenticated;

grant UPDATE on table public.price_disputes to service_role;

grant UPDATE on table public.profiles to anon;

grant UPDATE on table public.profiles to authenticated;

grant UPDATE on table public.profiles to service_role;

grant UPDATE on table public.rate_limit_buckets to anon;

grant UPDATE on table public.rate_limit_buckets to authenticated;

grant UPDATE on table public.rate_limit_buckets to service_role;

grant UPDATE on table public.reconciliation_exceptions to anon;

grant UPDATE on table public.reconciliation_exceptions to authenticated;

grant UPDATE on table public.reconciliation_exceptions to service_role;

grant UPDATE on table public.report_exports to anon;

grant UPDATE on table public.report_exports to authenticated;

grant UPDATE on table public.report_exports to service_role;

grant UPDATE on table public.resources to anon;

grant UPDATE on table public.resources to authenticated;

grant UPDATE on table public.resources to service_role;

grant UPDATE on table public.reviews to anon;

grant UPDATE on table public.reviews to authenticated;

grant UPDATE on table public.reviews to service_role;

grant UPDATE on table public.settlement_periods to anon;

grant UPDATE on table public.settlement_periods to authenticated;

grant UPDATE on table public.settlement_periods to service_role;

grant UPDATE on table public.support_conversations to anon;

grant UPDATE on table public.support_conversations to authenticated;

grant UPDATE on table public.support_conversations to service_role;

grant UPDATE on table public.support_knowledge_articles to anon;

grant UPDATE on table public.support_knowledge_articles to authenticated;

grant UPDATE on table public.support_knowledge_articles to service_role;

grant UPDATE on table public.support_messages to anon;

grant UPDATE on table public.support_messages to authenticated;

grant UPDATE on table public.support_messages to service_role;

grant UPDATE on table public.suspensions to anon;

grant UPDATE on table public.suspensions to authenticated;

grant UPDATE on table public.suspensions to service_role;

grant UPDATE on table public.treatment_catalog to anon;

grant UPDATE on table public.treatment_catalog to authenticated;

grant UPDATE on table public.treatment_catalog to service_role;

grant UPDATE on table public.treatment_variants to anon;

grant UPDATE on table public.treatment_variants to authenticated;

grant UPDATE on table public.treatment_variants to service_role;

grant UPDATE on table public.verification_records to anon;

grant UPDATE on table public.verification_records to authenticated;

grant UPDATE on table public.verification_records to service_role;

grant USAGE on schema private to authenticated;

grant USAGE on schema private to service_role;

grant USAGE on schema public to anon;

grant USAGE on schema public to authenticated;

grant USAGE on schema public to service_role;

grant USAGE on sequence public.audit_events_id_seq to anon;

grant USAGE on sequence public.audit_events_id_seq to authenticated;

grant USAGE on sequence public.audit_events_id_seq to service_role;

grant USAGE on sequence public.booking_status_history_id_seq to anon;

grant USAGE on sequence public.booking_status_history_id_seq to authenticated;

grant USAGE on sequence public.booking_status_history_id_seq to service_role;

grant USAGE on sequence public.payment_events_id_seq to anon;

grant USAGE on sequence public.payment_events_id_seq to authenticated;

grant USAGE on sequence public.payment_events_id_seq to service_role;

-- END explicit role grants captured from catalog

commit;
