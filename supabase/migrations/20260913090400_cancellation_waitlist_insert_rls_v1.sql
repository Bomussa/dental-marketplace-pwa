drop policy if exists booking_waitlist_insert_own on public.booking_waitlist;
create policy booking_waitlist_insert_own on public.booking_waitlist
  for insert to authenticated
  with check ((select auth.uid()) = account_id);
