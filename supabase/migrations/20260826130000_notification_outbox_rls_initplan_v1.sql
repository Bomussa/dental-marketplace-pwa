-- Avoid per-row evaluation of the authenticated user's JWT in the patient notification read policy.
-- The access contract is unchanged: an active account may read only its own notifications,
-- while a platform administrator may read the outbox according to the existing claim gate.

begin;

drop policy if exists "users read own notification outbox" on public.notification_outbox;

create policy "users read own notification outbox"
on public.notification_outbox
for select
using (
  (
    recipient_user_id = (select auth.uid())
    and not private.is_account_login_disabled((select auth.uid()))
  )
  or coalesce(
    (((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean),
    false
  )
);

commit;
