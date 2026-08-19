-- Prevent browser clients from bypassing the audited server workflows.
-- Booking lifecycle changes are exclusively handled by server-only RPCs.
-- Support creation is exclusively handled by the rate-limited, safety-aware API route.
-- Patient reviews may only be created as pending and cannot self-publish or mutate directly.

begin;

-- Dedicated server-only RPCs own all booking transitions.
drop policy if exists bookings_update_authorized on public.bookings;

-- The support API owns conversation creation, safety classification, message limits,
-- and writing both user and assistant messages using the server secret.
drop policy if exists "users open their support conversations" on public.support_conversations;
drop policy if exists "users close their support conversations" on public.support_conversations;
drop policy if exists "users add their own support questions" on public.support_messages;

-- A patient can submit a review only for an eligible completed booking, and it must
-- enter moderation as pending. Any later state transition belongs to an administrator.
drop policy if exists reviews_insert_completed on public.reviews;
create policy reviews_insert_completed
  on public.reviews
  for insert
  to authenticated
  with check (
    patient_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.bookings b
      where b.id = reviews.booking_id
        and b.patient_id = (select auth.uid())
        and b.status = 'completed'
        and reviews.clinic_id = b.clinic_id
        and reviews.practitioner_id is not distinct from b.practitioner_id
    )
  );

drop policy if exists reviews_authorized_update on public.reviews;
create policy reviews_authorized_update
  on public.reviews
  for update
  to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

commit;
