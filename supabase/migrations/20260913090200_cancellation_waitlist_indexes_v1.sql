create unique index if not exists booking_waitlist_active_patient_offer_uidx on public.booking_waitlist(patient_profile_id,offer_id) where status='active';
create index if not exists booking_waitlist_offer_status_created_idx on public.booking_waitlist(offer_id,status,created_at,id);
create index if not exists booking_waitlist_account_status_idx on public.booking_waitlist(account_id,status,created_at desc);
