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
  v_status text;
  v_account_id uuid;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  select status, account_id
    into v_status, v_account_id
  from public.booking_waitlist
  where id = p_waitlist_id
  for update;

  if not found then
    raise exception 'waitlist entry not found' using errcode = 'P0002';
  end if;

  if v_account_id <> p_actor_id then
    raise exception 'not authorized for this waitlist entry' using errcode = '42501';
  end if;

  if v_status = 'cancelled' then
    return 'cancelled';
  end if;

  if v_status <> 'active' then
    raise exception 'waitlist entry cannot be withdrawn from current state' using errcode = '55000';
  end if;

  update public.booking_waitlist
  set status = 'cancelled', updated_at = now()
  where id = p_waitlist_id;

  insert into public.audit_events(actor_id, action, target_type, target_id, metadata)
  values (
    p_actor_id,
    'booking.waitlist_withdrawn',
    'booking_waitlist',
    p_waitlist_id::text,
    jsonb_build_object('previous_status', 'active')
  );

  return 'cancelled';
end;
$$;

revoke all on function public.withdraw_booking_waitlist_server(uuid, uuid) from public, anon, authenticated;
grant execute on function public.withdraw_booking_waitlist_server(uuid, uuid) to service_role;
