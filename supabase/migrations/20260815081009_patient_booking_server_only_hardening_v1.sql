-- Enforce the first-party server gateway for booking and remove ambiguous RLS linting.

create policy device_installations_no_client_access
  on public.device_installations
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on function public.handle_new_account_patient_profile() from public, anon, authenticated;

create or replace function public.book_slot_server(
  p_actor_id uuid,
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
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  -- The private booking function deliberately reads auth.uid(). This value is set
  -- only inside this service-role-only wrapper after server authentication.
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  return query
  select *
  from private.book_slot_internal(p_slot_id, p_offer_id, p_idempotency_key, p_patient_profile_id);
end;
$$;

revoke all on function public.book_slot(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.book_slot(uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.book_slot_server(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.book_slot_server(uuid,uuid,uuid,text,uuid) to service_role;
