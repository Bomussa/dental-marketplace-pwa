create or replace function public.change_booking_status_server(p_actor_id uuid, p_booking_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_allowed boolean := false;
  v_status text;
begin
  if p_actor_id is null or p_booking_id is null then
    raise exception 'actor and booking are required' using errcode='22023';
  end if;
  if p_status not in ('confirmed','completed','clinic_cancelled','no_show','failed') then
    raise exception 'unsupported clinic booking status' using errcode='22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode='P0002'; end if;

  v_allowed := coalesce(private.is_platform_admin_for_actor(p_actor_id), false)
    or private.has_clinic_role_for_actor(p_actor_id,v_booking.clinic_id,v_booking.branch_id,array['owner','manager','receptionist']::text[]);
  if not v_allowed then raise exception 'actor cannot manage this booking' using errcode='42501'; end if;

  if p_status = 'completed' then
    if v_booking.status <> 'checked_in' then
      raise exception 'booking must be checked in before completion' using errcode='55000';
    end if;
    if not exists (select 1 from public.booking_attendance_events e where e.booking_id=p_booking_id and e.event_type='checked_in') then
      raise exception 'booking has no recorded check-in' using errcode='55000';
    end if;
    if exists (select 1 from public.booking_attendance_events e where e.booking_id=p_booking_id and e.event_type='attendance_reversed') then
      raise exception 'reversed attendance cannot be completed' using errcode='55000';
    end if;
  end if;

  update public.bookings set status=p_status where id=p_booking_id returning status into v_status;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata)
  values(p_actor_id,'booking.status_changed','booking',p_booking_id::text,jsonb_build_object('from',v_booking.status,'to',v_status,'branch_id',v_booking.branch_id));
  return v_status;
end;
$$;
