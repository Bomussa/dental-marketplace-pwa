-- Harden the booking path so direct API callers cannot book records that are not
-- eligible for public marketplace display. Keep the public search and booking
-- contracts aligned at the database source of truth.
create or replace function private.book_slot_internal(
  p_slot_id uuid,
  p_offer_id uuid,
  p_idempotency_key text,
  p_patient_profile_id uuid
)
returns table(booking_id uuid, booking_code text, booking_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.patient_profiles%rowtype;
  v_slot public.availability_slots%rowtype;
  v_offer record;
  v_existing public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_code text;
  v_snapshot jsonb;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_patient_profile_id is null then raise exception 'patient profile is required' using errcode = '22023'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'invalid idempotency key' using errcode = '22023'; end if;

  select * into v_profile
  from public.patient_profiles
  where id = p_patient_profile_id
    and account_id = v_user
    and archived_at is null
  for key share;
  if not found then raise exception 'patient profile is not available for this account' using errcode = '42501'; end if;

  if v_profile.national_id is null
    or v_profile.nationality is null
    or v_profile.date_of_birth is null
    or v_profile.phone is null
    or v_profile.phone_verified_at is null then
    raise exception 'patient profile must be complete and phone verified' using errcode = '22023';
  end if;

  select * into v_existing
  from public.bookings
  where booked_by_user_id = v_user and idempotency_key = p_idempotency_key
  limit 1;
  if found then
    return query select v_existing.id, v_existing.booking_code, v_existing.status;
    return;
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then raise exception 'slot not found' using errcode = 'P0002'; end if;
  if v_slot.status <> 'published' or v_slot.start_at <= now() or (v_slot.expires_at is not null and v_slot.expires_at <= now()) then
    raise exception 'slot is not bookable' using errcode = 'P0001';
  end if;

  select o.*, b.clinic_id, b.status branch_status, c.status clinic_status,
         tc.code treatment_code, tc.name_ar treatment_name_ar, tc.name_en treatment_name_en,
         tv.variant_key, tv.name_ar variant_name_ar, tv.name_en variant_name_en
  into v_offer
  from public.branch_service_offers o
  join public.branches b on b.id = o.branch_id
  join public.clinics c on c.id = b.clinic_id
  join public.treatment_variants tv on tv.id = o.variant_id and tv.active
  join public.treatment_catalog tc on tc.id = tv.catalog_id and tc.active
  where o.id = p_offer_id
    and o.branch_id = v_slot.branch_id
    and o.variant_id = v_slot.variant_id
    and o.status = 'active'
    and public.is_price_scope_publishable(o.price_scope)
    and o.scope_confirmed_at is not null
    and o.clinic_attested_at is not null
    and o.effective_from <= now()
    and (o.effective_to is null or o.effective_to > now())
    and b.status = 'active'
    and c.status = 'active'
    and not c.is_synthetic
  limit 1;

  if not found then
    raise exception 'offer or slot treatment is not eligible' using errcode = 'P0001';
  end if;
  if extract(epoch from (v_slot.end_at - v_slot.start_at)) / 60.0 < v_offer.duration_minutes then
    raise exception 'slot is shorter than clinical duration' using errcode = 'P0001';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_snapshot := jsonb_build_object(
    'offer_id', v_offer.id, 'treatment_code', v_offer.treatment_code,
    'treatment_name_ar', v_offer.treatment_name_ar, 'treatment_name_en', v_offer.treatment_name_en,
    'variant_key', v_offer.variant_key, 'variant_name_ar', v_offer.variant_name_ar, 'variant_name_en', v_offer.variant_name_en,
    'price_type', v_offer.price_type, 'min_minor', v_offer.min_minor, 'max_minor', v_offer.max_minor, 'currency', v_offer.currency,
    'duration_minutes', v_offer.duration_minutes,
    'consultation_included', v_offer.consultation_included, 'xray_included', v_offer.xray_included,
    'anesthesia_included', v_offer.anesthesia_included, 'lab_included', v_offer.lab_included,
    'included_items', v_offer.included_items, 'excluded_items', v_offer.excluded_items,
    'effective_from', v_offer.effective_from, 'clinic_attested_at', v_offer.clinic_attested_at,
    'last_verified_at', v_offer.last_verified_at, 'captured_at', now()
  );

  begin
    insert into public.bookings(
      patient_id, booked_by_user_id, patient_profile_id, clinic_id, branch_id,
      practitioner_id, resource_id, slot_id, offer_id, start_at, end_at,
      status, offer_snapshot, idempotency_key, booking_code
    ) values (
      v_user, v_user, v_profile.id, v_offer.clinic_id, v_slot.branch_id,
      v_slot.practitioner_id, v_slot.resource_id, v_slot.id, v_offer.id,
      v_slot.start_at, v_slot.end_at, 'pending_clinic_confirmation',
      v_snapshot, p_idempotency_key, v_code
    ) returning * into v_booking;
  exception
    when unique_violation then
      select * into v_existing from public.bookings
      where booked_by_user_id = v_user and idempotency_key = p_idempotency_key
      limit 1;
      if found then
        return query select v_existing.id, v_existing.booking_code, v_existing.status;
        return;
      end if;
      raise exception 'slot already claimed' using errcode = 'P0001';
    when exclusion_violation then
      raise exception 'practitioner or resource already booked' using errcode = 'P0001';
  end;

  update public.availability_slots set status = 'held' where id = v_slot.id;
  insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, reason)
    values (v_booking.id, null, v_booking.status, v_user, 'booking_created');
  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
    values (v_user, 'booking.created', 'booking', v_booking.id::text, jsonb_build_object(
      'slot_id', v_slot.id, 'offer_id', v_offer.id, 'variant_id', v_slot.variant_id,
      'patient_profile_id', v_profile.id
    ));
  return query select v_booking.id, v_booking.booking_code, v_booking.status;
end;
$$;

revoke maintain, references, trigger, truncate on all tables in schema public from anon, authenticated;
