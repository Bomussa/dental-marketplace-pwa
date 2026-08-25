-- Harden PostgREST RPC exposure without changing business data.
-- Public search remains intentionally available to visitors; state-changing server RPCs are service-role only.

revoke execute on all functions in schema public from public;

grant execute on all functions in schema public to service_role;

do $$
declare
  function_signature text;
begin
  -- Functions invoked directly by authenticated application sessions retain access.
  -- Server variants accept an explicit actor and must only be called by server code using service_role.
  for function_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname !~ '_server$'
      and p.proname not in (
        'handle_new_account_patient_profile',
        'enforce_public_offer_price_scope'
      )
  loop
    execute format('grant execute on function %s to authenticated', function_signature);
  end loop;
end
$$;

-- This is the only anonymous RPC required by the visitor-facing search route.
grant execute on function public.search_dental_offers(uuid, double precision, double precision, double precision) to anon;

do $$
declare
  function_signature text;
begin
  for function_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname ~ '_server$'
  loop
    execute format('revoke execute on function %s from authenticated', function_signature);
  end loop;
end
$$;

comment on schema public is 'Application schema. Anonymous RPC execution is limited to public search; server RPCs are service-role only.';
