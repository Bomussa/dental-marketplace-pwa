-- The prior baseline contained explicit anon grants. Remove them deterministically,
-- then re-enable only the visitor-facing search RPC.
revoke execute on all functions in schema public from anon;
grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to anon;
