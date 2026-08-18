-- Store a deterministic treatment label for both supported interface languages.
-- Recipient selection, event type, deduplication, and RLS-adjacent security definer scope remain unchanged.
create or replace function private.enqueue_booking_confirmed_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_treatment_name_ar text;
  v_treatment_name_en text;
begin
  if tg_op = 'INSERT' and new.status = 'pending_clinic_confirmation' then
    v_treatment_name_ar := coalesce(
      new.offer_snapshot ->> 'treatment_name_ar',
      new.offer_snapshot ->> 'variant_name_ar',
      new.offer_snapshot ->> 'treatment_name_en',
      new.offer_snapshot ->> 'variant_name_en',
      'العلاج المختار'
    );
    v_treatment_name_en := coalesce(
      new.offer_snapshot ->> 'treatment_name_en',
      new.offer_snapshot ->> 'variant_name_en',
      new.offer_snapshot ->> 'treatment_name_ar',
      new.offer_snapshot ->> 'variant_name_ar',
      'Selected treatment'
    );

    insert into public.notification_outbox (
      recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
    )
    select
      membership.user_id,
      'booking_requested',
      new.id::text,
      'push',
      'ar',
      jsonb_build_object(
        'booking_id', new.id,
        'booking_code', new.booking_code,
        'start_at', new.start_at,
        'clinic_id', new.clinic_id,
        'branch_id', new.branch_id,
        'treatment_name', v_treatment_name_ar,
        'treatment_name_ar', v_treatment_name_ar,
        'treatment_name_en', v_treatment_name_en
      ),
      'booking_requested:' || new.id::text || ':' || membership.user_id::text || ':push:ar',
      'pending',
      new.booked_by_user_id
    from public.clinic_memberships membership
    where membership.clinic_id = new.clinic_id
      and membership.status = 'active'
      and membership.role in ('owner', 'manager', 'receptionist')
      and (membership.branch_id is null or membership.branch_id = new.branch_id)
    on conflict (dedupe_key) do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'confirmed' and old.status is distinct from new.status then
    insert into public.notification_outbox (
      recipient_user_id, event_type, event_id, channel, locale, payload, dedupe_key, status, created_by
    ) values (
      new.booked_by_user_id,
      'booking_confirmed',
      new.id::text,
      'push',
      'ar',
      jsonb_build_object('booking_id', new.id, 'booking_code', new.booking_code, 'start_at', new.start_at, 'clinic_id', new.clinic_id),
      'booking_confirmed:' || new.id::text || ':' || new.booked_by_user_id::text || ':push:ar',
      'pending',
      new.booked_by_user_id
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.enqueue_booking_confirmed_notifications() from public;
