-- Server-only read model for the account waitlist section.
-- Keep the browser boundary consistent with join/withdraw mutations.
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

revoke all on function public.list_booking_waitlist_server(uuid) from public, anon, authenticated;
grant execute on function public.list_booking_waitlist_server(uuid) to service_role;
