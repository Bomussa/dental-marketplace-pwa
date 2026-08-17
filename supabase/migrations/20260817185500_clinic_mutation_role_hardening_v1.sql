-- Enforce the clinic role matrix at the database boundary.
-- Booking mutations must flow through audited server RPCs; a browser session may never patch booking rows directly.
revoke insert, update, delete on table public.bookings from anon, authenticated;

-- Pricing managers may create offers and propose a revision through the governed RPC, but cannot publish or directly patch live pricing.
drop policy if exists offers_staff_update on public.branch_service_offers;
create policy offers_staff_update
  on public.branch_service_offers
  for update
  to authenticated
  using (
    (select private.has_branch_access(branch_service_offers.branch_id, array['owner', 'manager']))
  )
  with check (
    (select private.has_branch_access(branch_service_offers.branch_id, array['owner', 'manager']))
  );
