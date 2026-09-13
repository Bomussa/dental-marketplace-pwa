create unique index if not exists booking_waitlist_active_patient_offer_uidx on public.booking_waitlist(patient_profile_id,offer_id) where status='active';
