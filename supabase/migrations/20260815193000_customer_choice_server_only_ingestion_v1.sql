-- Customer-choice events must enter through the first-party Vercel API only.
-- The API writes with a server-only Supabase secret; browser roles have no direct INSERT path.

revoke insert on table public.customer_choice_events from anon, authenticated;
revoke insert (event_id, session_id, event_name, page_path, treatment_id, variant_id, offer_id, slot_id, choice_value)
  on table public.customer_choice_events
  from anon, authenticated;

comment on table public.customer_choice_events is
  'First-party product telemetry. Direct browser INSERT is revoked; ingest through the server API only.';
