-- Cancellation waitlist foundation. No automatic rebooking.
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