-- Production parity reconciliation for the waitlist RPC surface.
-- The waitlist table/RLS/indexes already exist in the production database; this
-- migration makes the final server-only RPC contract reproducible from Git.

create or replace function public.list_booking_waitlist_server(p_actor_id uuid)
returns table(
  waitlist_id uuid,
  status text,
  created_at timestamptz,
  notified_at timestamptz,
  treatment_name_ar text,
  treatment_name_en text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  return query
  select
    w.id,
    w.status,
    w.created_at,
    w.notified_at,
    tv.name_ar,
    tv.name_en
  from public.booking_waitlist w
  join public.treatment_variants tv on tv.id = w.variant_id
  where w.account_id = p_actor_id
    and w.status in ('active', 'notified')
  order by w.created_at desc
  limit 20;
end;
$$;

-- Keep all waitlist mutation/read RPCs server-only. Client roles must not be
-- able to invoke SECURITY DEFINER functions directly through PostgREST.
revoke execute on function public.join_booking_waitlist_server(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.list_booking_waitlist_server(uuid) from public, anon, authenticated;
revoke execute on function public.withdraw_booking_waitlist_server(uuid, uuid) from public, anon, authenticated;

grant execute on function public.join_booking_waitlist_server(uuid, uuid, uuid) to service_role;
grant execute on function public.list_booking_waitlist_server(uuid) to service_role;
grant execute on function public.withdraw_booking_waitlist_server(uuid, uuid) to service_role;
