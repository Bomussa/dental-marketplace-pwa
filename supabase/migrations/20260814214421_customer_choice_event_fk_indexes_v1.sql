create index if not exists customer_choice_events_treatment_idx
  on public.customer_choice_events (treatment_id, created_at desc)
  where treatment_id is not null;

create index if not exists customer_choice_events_offer_idx
  on public.customer_choice_events (offer_id, created_at desc)
  where offer_id is not null;

create index if not exists customer_choice_events_slot_idx
  on public.customer_choice_events (slot_id, created_at desc)
  where slot_id is not null;
