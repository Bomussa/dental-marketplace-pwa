-- The public search function must inspect a private verification source without exposing that table to anon/authenticated roles.
-- Its result contract remains restricted to public search fields and the function uses a fixed empty search_path.
alter function public.search_dental_offers(uuid, double precision, double precision, double precision)
  security definer;

alter function public.search_dental_offers(uuid, double precision, double precision, double precision)
  set search_path = '';

revoke all on function public.search_dental_offers(uuid, double precision, double precision, double precision) from public;
grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to anon, authenticated;
