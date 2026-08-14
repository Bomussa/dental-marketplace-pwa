create table if not exists public.customer_choice_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'treatment_selected',
    'variant_selected',
    'appointment_preference_selected',
    'location_requested',
    'location_acquired',
    'location_denied',
    'search_submitted',
    'offer_booking_clicked',
    'booking_login_required',
    'booking_succeeded',
    'booking_failed'
  )),
  page_path text not null default '/' check (char_length(page_path) between 1 and 300),
  treatment_id uuid references public.treatment_catalog(id) on delete set null,
  variant_id uuid references public.treatment_variants(id) on delete set null,
  offer_id uuid references public.branch_service_offers(id) on delete set null,
  slot_id uuid references public.availability_slots(id) on delete set null,
  choice_value jsonb not null default '{}'::jsonb check (jsonb_typeof(choice_value) = 'object' and pg_column_size(choice_value) <= 4096),
  created_at timestamptz not null default now()
);

create index if not exists customer_choice_events_created_idx on public.customer_choice_events (created_at desc);
create index if not exists customer_choice_events_session_idx on public.customer_choice_events (session_id, created_at desc);
create index if not exists customer_choice_events_name_idx on public.customer_choice_events (event_name, created_at desc);
create index if not exists customer_choice_events_variant_idx on public.customer_choice_events (variant_id, created_at desc) where variant_id is not null;

alter table public.customer_choice_events enable row level security;

revoke all on public.customer_choice_events from anon, authenticated;
grant insert on public.customer_choice_events to anon, authenticated;
grant select on public.customer_choice_events to authenticated;

create policy "customer choice events append only"
on public.customer_choice_events
for insert
to anon, authenticated
with check (true);

create policy "platform admins can read customer choice events"
on public.customer_choice_events
for select
to authenticated
using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'customer_choice_events'
     ) then
    alter publication supabase_realtime add table public.customer_choice_events;
  end if;
end $$;
