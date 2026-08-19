-- Scale-critical indexes for public search and restricted clinic-operator audit paths.
-- These indexes do not change data, authorization, or booking semantics.

-- Public comparison finds the first future published slot for a branch and exact variant.
create index if not exists availability_slots_public_search_idx
  on public.availability_slots (branch_id, variant_id, start_at)
  include (id, end_at, expires_at)
  where status = 'published';

-- Public comparison starts from an exact variant and active offer before joining branch data.
create index if not exists branch_service_offers_public_search_idx
  on public.branch_service_offers (variant_id, effective_from, branch_id)
  include (id, effective_to, min_minor, max_minor, duration_minutes)
  where status = 'active';

-- Cover the foreign keys used by the server-only clinic-operator account workflow.
create index if not exists clinic_operator_accounts_membership_idx
  on public.clinic_operator_accounts (membership_id);

create index if not exists clinic_operator_accounts_created_by_idx
  on public.clinic_operator_accounts (created_by);

create index if not exists clinic_operator_account_events_operator_account_idx
  on public.clinic_operator_account_events (operator_account_id);

create index if not exists clinic_operator_account_events_operator_user_idx
  on public.clinic_operator_account_events (operator_user_id);

create index if not exists clinic_operator_account_events_actor_user_idx
  on public.clinic_operator_account_events (actor_user_id);
