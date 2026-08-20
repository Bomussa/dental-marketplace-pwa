-- Remove a redundant authenticated UPDATE policy.
-- feature_flags_platform_admin_all already grants the same platform-admin UPDATE access
-- with the same USING and WITH CHECK predicates.
drop policy if exists feature_flags_platform_admin_update on public.feature_flags;
