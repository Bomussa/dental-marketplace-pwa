-- The results page uses the visitor JWT when a patient is signed in.
-- Keep the same read-only search RPC available to authenticated visitors.
grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to authenticated;
