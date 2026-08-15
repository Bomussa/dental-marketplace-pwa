-- The public search invoker needs schema resolution for the private helper.
-- EXECUTE on the helper remains revoked, so anon/authenticated cannot call it directly.
grant usage on schema private to anon, authenticated;
