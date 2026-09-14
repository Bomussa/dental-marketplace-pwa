-- Harden the cancellation waitlist as a server-only workflow and make the
-- notification contract reproducible from migrations. No automatic rebooking.

-- The application calls the RPCs through the server admin client. Direct
-- authenticated/anonymous execution would bypass the intended server boundary.
revoke all on function public.join_booking_waitlist_server(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_booking_waitlist_server(uuid, uuid, uuid) to service_role;

-- Do not allow browser roles to insert waitlist rows directly. The RPC is the
-- canonical mutation path and performs ownership/profile/offer validation.
drop policy if exists "booking waitlist insert own" on public.booking_waitlist;
revoke all on table public.booking_waitlist from anon, authenticated;

-- Keep the existing notification event contract and add the waitlist event
-- without removing any established event types.
alter table public.notification_outbox
  drop constraint if exists notification_outbox_event_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_event_type_check
  check (event_type in (
    'booking_requested',
    'booking_confirmed',
    'booking_cancelled',
    'booking_updated',
    'attendance_recorded',
    'price_updated',
    'support_reply',
    'waitlist_slot_opened',
    'manual'
  ));

-- Patient withdrawal is idempotent: an already-cancelled/expired/notified
-- entry is not mutated again. Ownership is checked inside the privileged RPC.
create or replace function public.withdraw_booking_waitlist_server(
  p_actor_id uuid,
  p_waitlist_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.booking_waitlist%rowtype;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  select * into v_entry
  from public.booking_waitlist
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist entry not found' using errcode = 'P0002';
  end if;

  if v_entry.account_id <> p_actor_id then
    raise exception 'not authorized for this waitlist entry' using errcode = '42501';
  end if;

  if v_entry.status = 'cancelled' then
    return v_entry.status;
  end if;

  if v_entry.status <> 'active' then
    raise exception 'waitlist entry cannot be withdrawn from current state' using errcode = '55000';
  end if;

  update public.booking_waitlist
  set status = 'cancelled', updated_at = now()
  where id = v_entry.id;

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'booking.waitlist_withdrawn',
    'booking_waitlist',
    v_entry.id::text,
    jsonb_build_object('offer_id', v_entry.offer_id, 'variant_id', v_entry.variant_id, 'patient_profile_id', v_entry.patient_profile_id)
  );

  return 'cancelled';
end;
$$;

revoke all on function public.withdraw_booking_waitlist_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.withdraw_booking_waitlist_server(uuid, uuid) to service_role;

-- Cancellation releases the slot in the existing cancel_booking_server RPC.
-- This trigger only notifies matching active waitlist entries and marks them
-- notified; it never books a patient automatically. The transition guard keeps
-- repeated cancellation calls from creating duplicate notifications.
create or replace function private.enqueue_waitlist_slot_opened_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'patient_cancelled' and old.status is distinct from new.status then
    insert into public.notification_outbox (
      recipient_user_id,
      event_type,
      event_id,
      channel,
      locale,
      payload,
      dedupe_key,
      status,
      created_by
    )
    select
      w.account_id,
      'waitlist_slot_opened',
      new.slot_id::text,
      'in_app',
      'ar',
      jsonb_build_object(
        'booking_id', new.id,
        'booking_code', new.booking_code,
        'slot_id', new.slot_id,
        'offer_id', new.offer_id,
        'start_at', new.start_at,
        'clinic_id', new.clinic_id,
        'branch_id', new.branch_id
      ),
      'waitlist_slot_opened:' || new.slot_id::text || ':' || w.id::text || ':in_app:ar',
      'stored',
      new.booked_by_user_id
    from public.booking_waitlist w
    where w.offer_id = new.offer_id
      and w.variant_id = (select s.variant_id from public.availability_slots s where s.id = new.slot_id)
      and w.status = 'active'
    on conflict (dedupe_key) do nothing;

    update public.booking_waitlist w
    set status = 'notified', notified_at = now(), updated_at = now()
    where w.offer_id = new.offer_id
      and w.variant_id = (select s.variant_id from public.availability_slots s where s.id = new.slot_id)
      and w.status = 'active';
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_waitlist_slot_opened_notifications() from public, anon, authenticated;

drop trigger if exists booking_cancellation_waitlist_notification on public.bookings;
create trigger booking_cancellation_waitlist_notification
after update of status on public.bookings
for each row
execute function private.enqueue_waitlist_slot_opened_notifications();
