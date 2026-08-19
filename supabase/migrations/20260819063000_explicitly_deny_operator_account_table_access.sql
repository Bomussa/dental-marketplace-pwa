-- These tables are intentionally accessed only through SECURITY DEFINER service RPCs.
-- Explicit deny policies document that intent and keep all client-facing roles row-denied.

create policy "deny client access to account usernames"
on public.account_usernames
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny client access to clinic operator accounts"
on public.clinic_operator_accounts
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny client access to clinic operator account events"
on public.clinic_operator_account_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
