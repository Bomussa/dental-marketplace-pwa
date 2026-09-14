-- PR #28 production alignment: waitlist mutations are server-only.
-- This migration is intentionally idempotent and mirrors the production
-- security repair applied on 2026-09-14.
revoke all on table public.booking_waitlist from anon, authenticated;
drop policy if exists "booking_waitlist_insert_own" on public.booking_waitlist;
drop policy if exists "booking waitlist insert own" on public.booking_waitlist;
revoke all on function public.join_booking_waitlist_server(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_booking_waitlist_server(uuid, uuid, uuid) to service_role;
revoke all on function public.withdraw_booking_waitlist_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.withdraw_booking_waitlist_server(uuid, uuid) to service_role;
