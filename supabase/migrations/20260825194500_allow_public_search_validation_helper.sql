-- search_dental_offers is intentionally public. It evaluates this non-SECURITY DEFINER
-- validation helper while resolving advertised price scope for anonymous visitors.
-- Grant only this helper; server-side routines remain unavailable to anon/authenticated.
grant execute on function public.is_price_scope_publishable(jsonb) to anon;
