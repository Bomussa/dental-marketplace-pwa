create index if not exists booking_waitlist_offer_status_created_idx on public.booking_waitlist(offer_id,status,created_at,id);
