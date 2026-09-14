drop policy if exists booking_waitlist_select_own on public.booking_waitlist;
create policy booking_waitlist_select_own on public.booking_waitlist
  for select to authenticated
  using ((select auth.uid()) = account_id);
