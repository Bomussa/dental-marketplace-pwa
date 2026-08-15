-- Operational source-of-truth core: price revisions, attendance and accounting.
-- No payment provider is enabled by this migration.

create table if not exists public.offer_revisions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.branch_service_offers(id) on delete restrict,
  revision_no integer not null check (revision_no > 0),
  previous_snapshot jsonb not null default '{}'::jsonb,
  proposed_snapshot jsonb not null default '{}'::jsonb,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','superseded')),
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, revision_no),
  check ((status not in ('approved','rejected')) or (reviewed_by is not null and reviewed_at is not null))
);

create index if not exists offer_revisions_offer_created_idx on public.offer_revisions(offer_id, created_at desc);

create table if not exists public.booking_attendance_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  event_type text not null check (event_type in ('checked_in','attendance_reversed')),
  reason text check (reason is null or char_length(trim(reason)) between 3 and 500),
  occurred_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id),
  source_type text not null default 'clinic_ui' check (source_type in ('clinic_ui','admin_ui','api')),
  source_id text,
  created_at timestamptz not null default now(),
  unique (booking_id, event_type, source_type, source_id)
);

create unique index if not exists booking_one_active_checkin_idx
  on public.booking_attendance_events(booking_id)
  where event_type = 'checked_in';
create index if not exists booking_attendance_occurred_idx
  on public.booking_attendance_events(occurred_at desc, booking_id);

create table if not exists public.clinic_fee_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  fee_type text not null check (fee_type in ('per_attended_booking','percentage_of_offer_snapshot')),
  fixed_minor integer check (fixed_minor is null or fixed_minor >= 0),
  rate_bps integer check (rate_bps is null or rate_bps between 0 and 10000),
  currency char(3) not null default 'QAR' check (currency = 'QAR'),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((fee_type = 'per_attended_booking' and fixed_minor is not null and rate_bps is null) or
         (fee_type = 'percentage_of_offer_snapshot' and rate_bps is not null and fixed_minor is null)),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists clinic_fee_rules_effective_idx
  on public.clinic_fee_rules(clinic_id, branch_id, effective_from desc)
  where status = 'active';

create table if not exists public.settlement_periods (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  period_kind text not null check (period_kind in ('weekly','monthly','annual','manual')),
  status text not null default 'open' check (status in ('open','proposed','approved','closed','void')),
  currency char(3) not null default 'QAR' check (currency = 'QAR'),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  closed_by uuid references auth.users(id),
  approved_at timestamptz,
  closed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, period_start, period_end, period_kind),
  check (period_end >= period_start),
  check ((status not in ('approved','closed')) or (approved_by is not null and approved_at is not null)),
  check ((status != 'closed') or (closed_by is not null and closed_at is not null))
);

create index if not exists settlement_periods_clinic_status_idx
  on public.settlement_periods(clinic_id, status, period_start desc);

create table if not exists public.accounting_journals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  settlement_period_id uuid references public.settlement_periods(id) on delete restrict,
  source_type text not null check (source_type in ('attendance','attendance_reversal','manual_adjustment','period_correction')),
  source_id text not null,
  journal_type text not null check (journal_type in ('platform_fee_accrual','platform_fee_reversal','manual_adjustment')),
  status text not null default 'draft' check (status in ('draft','posted','reversed','void')),
  currency char(3) not null default 'QAR' check (currency = 'QAR'),
  occurred_at timestamptz not null default now(),
  description text not null check (char_length(trim(description)) between 3 and 500),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  posted_by uuid references auth.users(id),
  posted_at timestamptz,
  reversed_journal_id uuid references public.accounting_journals(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id, journal_type),
  check ((status != 'posted') or (posted_by is not null and posted_at is not null))
);

create index if not exists accounting_journals_period_idx
  on public.accounting_journals(settlement_period_id, occurred_at desc);
create index if not exists accounting_journals_clinic_status_idx
  on public.accounting_journals(clinic_id, status, occurred_at desc);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.accounting_journals(id) on delete restrict,
  line_no smallint not null check (line_no > 0),
  account_code text not null check (account_code in ('clinic_payable','platform_fee_revenue','adjustment_clearing')),
  debit_minor integer not null default 0 check (debit_minor >= 0),
  credit_minor integer not null default 0 check (credit_minor >= 0),
  memo text check (memo is null or char_length(memo) <= 500),
  created_at timestamptz not null default now(),
  unique (journal_id, line_no),
  check ((debit_minor > 0 and credit_minor = 0) or (credit_minor > 0 and debit_minor = 0))
);

create index if not exists accounting_journal_lines_journal_idx on public.accounting_journal_lines(journal_id);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete restrict,
  settlement_period_id uuid references public.settlement_periods(id) on delete restrict,
  report_kind text not null check (report_kind in ('weekly','monthly','annual','settlement','attendance')),
  format text not null check (format in ('csv','pdf')),
  filters jsonb not null default '{}'::jsonb,
  content_hash text,
  status text not null default 'queued' check (status in ('queued','generated','expired','failed')),
  requested_by uuid not null references auth.users(id),
  generated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists report_exports_requested_idx on public.report_exports(requested_by, created_at desc);

create or replace function private.guard_accounting_journal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.guard_accounting_journal_update() from public;

create or replace function private.guard_accounting_journal_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.guard_accounting_journal_lines() from public;

drop trigger if exists accounting_journals_guard_update on public.accounting_journals;
create trigger accounting_journals_guard_update
  before update on public.accounting_journals
  for each row execute function private.guard_accounting_journal_update();

drop trigger if exists accounting_journal_lines_posted_guard on public.accounting_journal_lines;
create trigger accounting_journal_lines_posted_guard
  before insert or update or delete on public.accounting_journal_lines
  for each row execute function private.guard_accounting_journal_lines();

alter table public.offer_revisions enable row level security;
alter table public.booking_attendance_events enable row level security;
alter table public.clinic_fee_rules enable row level security;
alter table public.settlement_periods enable row level security;
alter table public.accounting_journals enable row level security;
alter table public.accounting_journal_lines enable row level security;
alter table public.report_exports enable row level security;

create policy "offer revisions visible to related clinic" on public.offer_revisions
  for select using (exists (
    select 1 from public.branch_service_offers o
    join public.branches b on b.id = o.branch_id
    join public.clinic_memberships cm on cm.clinic_id = b.clinic_id
    where o.id = offer_revisions.offer_id and cm.user_id = auth.uid() and cm.status = 'active'
  ) or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "attendance visible to related clinic" on public.booking_attendance_events
  for select using (exists (
    select 1 from public.bookings b
    join public.clinic_memberships cm on cm.clinic_id = b.clinic_id
    where b.id = booking_attendance_events.booking_id and cm.user_id = auth.uid() and cm.status = 'active'
  ) or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "clinic fee rules admin only" on public.clinic_fee_rules
  for all using (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "settlement periods admin or clinic owner read" on public.settlement_periods
  for select using (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false) or exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = settlement_periods.clinic_id and cm.user_id = auth.uid()
      and cm.status = 'active' and cm.role in ('owner','manager')
  ));

create policy "journals admin or clinic owner read" on public.accounting_journals
  for select using (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false) or exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = accounting_journals.clinic_id and cm.user_id = auth.uid()
      and cm.status = 'active' and cm.role in ('owner','manager')
  ));

create policy "journal lines follow visible journal" on public.accounting_journal_lines
  for select using (exists (
    select 1 from public.accounting_journals j
    where j.id = accounting_journal_lines.journal_id and (
      coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false) or exists (
        select 1 from public.clinic_memberships cm
        where cm.clinic_id = j.clinic_id and cm.user_id = auth.uid()
          and cm.status = 'active' and cm.role in ('owner','manager')
      )
    )
  ));

create policy "report exports requester or admin" on public.report_exports
  for select using (requested_by = auth.uid() or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));
