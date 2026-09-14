-- Extend the existing cancellation state machine; do not introduce a parallel trigger.
-- A released slot remains published and is never auto-assigned.

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

create or replace function public.cancel_booking_server(
  p_actor_id uuid,
  p_booking_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_previous_status text;
  v_slot_released boolean := false;
  v_waitlist public.booking_waitlist%rowtype;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  if v_booking.booked_by_user_id <> p_actor_id then
    raise exception 'not authorized for this booking' using errcode = '42501';
  end if;

  if v_booking.status = 'patient_cancelled' then
    return v_booking.status;
  end if;

  if v_booking.status not in ('pending_clinic_confirmation', 'confirmed') then
    raise exception 'booking cannot be cancelled from current state' using errcode = '55000';
  end if;

  if v_booking.start_at <= now() then
    raise exception 'past bookings cannot be cancelled' using errcode = '55000';
  end if;

  v_previous_status := v_booking.status;

  update public.bookings
  set status = 'patient_cancelled'
  where id = v_booking.id;

  update public.availability_slots
  set status = 'published'
  where id = v_booking.slot_id
    and status = 'held';

  get diagnostics v_slot_released = row_count;

  insert into public.booking_status_history(
    booking_id, from_status, to_status, actor_id, reason
  ) values (
    v_booking.id, v_previous_status, 'patient_cancelled', p_actor_id, 'patient_cancelled'
  );

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'booking.cancelled',
    'booking',
    v_booking.id::text,
    jsonb_build_object('previous_status', v_previous_status, 'slot_id', v_booking.slot_id)
  );

  insert into public.notification_outbox(
    recipient_user_id, event_type, event_id, channel, locale, payload,
    dedupe_key, status, created_by
  ) values (
    v_booking.booked_by_user_id,
    'booking_cancelled',
    v_booking.id::text,
    'push',
    'ar',
    jsonb_build_object(
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code,
      'start_at', v_booking.start_at,
      'clinic_id', v_booking.clinic_id
    ),
    'booking_cancelled:' || v_booking.id::text || ':' || v_booking.booked_by_user_id::text || ':push:ar',
    'pending',
    p_actor_id
  ) on conflict (dedupe_key) do nothing;

  insert into public.notification_outbox(
    recipient_user_id, event_type, event_id, channel, locale, payload,
    dedupe_key, status, created_by
  )
  select
    membership.user_id,
    'booking_cancelled',
    v_booking.id::text,
    'push',
    'ar',
    jsonb_build_object(
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code,
      'start_at', v_booking.start_at,
      'clinic_id', v_booking.clinic_id
    ),
    'booking_cancelled:' || v_booking.id::text || ':' || membership.user_id::text || ':push:ar',
    'pending',
    p_actor_id
  from public.clinic_memberships membership
  where membership.clinic_id = v_booking.clinic_id
    and membership.status = 'active'
    and membership.role in ('owner', 'manager', 'receptionist')
  on conflict (dedupe_key) do nothing;

  if v_slot_released then
    for v_waitlist in
      select *
      from public.booking_waitlist
      where offer_id = v_booking.offer_id
        and status = 'active'
      order by created_at asc, id asc
      for update skip locked
    loop
      insert into public.notification_outbox(
        recipient_user_id, event_type, event_id, channel, locale, payload,
        dedupe_key, status, created_by
      ) values (
        v_waitlist.account_id,
        'waitlist_slot_opened',
        v_booking.id::text || ':' || v_waitlist.id::text,
        'in_app',
        'ar',
        jsonb_build_object(
          'booking_id', v_booking.id,
          'waitlist_id', v_waitlist.id,
          'slot_id', v_booking.slot_id,
          'offer_id', v_booking.offer_id,
          'clinic_id', v_booking.clinic_id,
          'start_at', v_booking.start_at,
          'booking_code', v_booking.booking_code
        ),
        'waitlist_slot_opened:' || v_booking.id::text || ':' || v_waitlist.id::text || ':in_app:ar',
        'stored',
        p_actor_id
      ) on conflict (dedupe_key) do nothing;

      update public.booking_waitlist
      set notified_at = now(), updated_at = now()
      where id = v_waitlist.id;
    end loop;
  end if;

  return 'patient_cancelled';
end;
$$;

revoke all on function public.cancel_booking_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking_server(uuid, uuid) to service_role;
