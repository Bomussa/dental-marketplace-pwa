create index if not exists booking_waitlist_account_status_idx on public.booking_waitlist(account_id,status,created_at desc);
