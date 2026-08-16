-- Harden the private helper boundary used by authenticated RLS policies and
-- repair review ownership/integrity. This migration is intentionally additive
-- to the migration history; no existing migration is rewritten.

-- Authenticated RLS policies need to resolve three boolean helper functions in
-- the private schema. Keep all other private functions non-callable.
revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_branch_access(uuid,text[]) to authenticated;
grant execute on function private.is_clinic_member(uuid,text[]) to authenticated;
grant execute on function private.is_platform_admin() to authenticated;

-- Prevent future private functions owned by the migration owner from receiving
-- default PUBLIC/anon/authenticated execute privileges.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from anon;
alter default privileges in schema private revoke execute on functions from authenticated;

-- Preserve the intended public clinic-application API while keeping its
-- private implementation directly inaccessible to authenticated clients.
alter function public.create_clinic_application(text,text) security definer;
alter function public.create_clinic_application(text,text) set search_path = '';
revoke all on function public.create_clinic_application(text,text) from public, anon, authenticated;
grant execute on function public.create_clinic_application(text,text) to authenticated;

-- Review guard: non-admin users may change review content/rating while pending,
-- but may never rebind the review to a different booking, patient, clinic or
-- practitioner, nor may they self-moderate the review status.
create or replace function private.guard_review_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if v_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'new review must start pending' using errcode='42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      raise exception 'review moderation status is admin-only' using errcode='42501';
    end if;

    if new.booking_id is distinct from old.booking_id
       or new.patient_id is distinct from old.patient_id
       or new.clinic_id is distinct from old.clinic_id
       or new.practitioner_id is distinct from old.practitioner_id then
      raise exception 'review ownership fields are immutable' using errcode='42501';
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function private.guard_review_status() from public, anon, authenticated;

drop trigger if exists review_status_guard on public.reviews;
create trigger review_status_guard
before insert or update on public.reviews
for each row execute function private.guard_review_status();

-- Bind review attribution to the completed owned booking. The previous policy
-- compared booking columns to themselves, which did not protect clinic or
-- practitioner attribution.
alter policy reviews_insert_completed on public.reviews
with check (
  patient_id = (select auth.uid())
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

comment on function private.guard_review_status() is
  'RLS-adjacent review integrity guard: patients cannot change review ownership/attribution or moderation status after insert.';
