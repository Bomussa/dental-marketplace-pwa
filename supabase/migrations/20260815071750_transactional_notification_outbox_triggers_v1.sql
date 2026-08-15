-- Transactional notification rows are written in the same transaction as booking and attendance facts.
-- Delivery is intentionally decoupled: a provider worker can retry notification_outbox safely later.

create or replace function private.enqueue_booking_confirmed_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'confirmed' then return new; end if;

  insert into public.notification_outbox (
    recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
  ) values (
    new.patient_id,
    'booking_confirmed',
    new.id::text,
    'push',
    'ar',
    jsonb_build_object('booking_id', new.id, 'booking_code', new.booking_code, 'start_at', new.start_at, 'clinic_id', new.clinic_id),
    'booking_confirmed:' || new.id::text || ':' || new.patient_id::text || ':push:ar',
    'pending',
    new.patient_id
  ) on conflict (dedupe_key) do nothing;

  insert into public.notification_outbox (
    recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
  )
  select
    membership.user_id,
    'booking_confirmed',
    new.id::text,
    'push',
    'ar',
    jsonb_build_object('booking_id', new.id, 'booking_code', new.booking_code, 'start_at', new.start_at, 'clinic_id', new.clinic_id),
    'booking_confirmed:' || new.id::text || ':' || membership.user_id::text || ':push:ar',
    'pending',
    new.patient_id
  from public.clinic_memberships membership
  where membership.clinic_id = new.clinic_id
    and membership.status = 'active'
    and membership.role in ('owner', 'manager', 'receptionist')
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

create or replace function private.enqueue_attendance_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare booking_row public.bookings%rowtype;
begin
  if new.event_type <> 'checked_in' then return new; end if;
  select * into booking_row from public.bookings where id = new.booking_id;
  if not found then return new; end if;

  insert into public.notification_outbox (
    recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
  ) values (
    booking_row.patient_id,
    'attendance_recorded',
    new.id::text,
    'push',
    'ar',
    jsonb_build_object('booking_id', booking_row.id, 'booking_code', booking_row.booking_code, 'attendance_event_id', new.id, 'occurred_at', new.occurred_at),
    'attendance_recorded:' || new.id::text || ':' || booking_row.patient_id::text || ':push:ar',
    'pending',
    new.recorded_by
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke all on function private.enqueue_booking_confirmed_notifications() from public;
revoke all on function private.enqueue_attendance_notifications() from public;

drop trigger if exists booking_confirmed_notification_outbox on public.bookings;
create trigger booking_confirmed_notification_outbox
after insert on public.bookings
for each row execute function private.enqueue_booking_confirmed_notifications();

drop trigger if exists attendance_notification_outbox on public.booking_attendance_events;
create trigger attendance_notification_outbox
after insert on public.booking_attendance_events
for each row execute function private.enqueue_attendance_notifications();
