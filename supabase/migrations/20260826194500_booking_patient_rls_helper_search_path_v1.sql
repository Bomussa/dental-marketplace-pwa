-- Align the private RLS helper with an explicit built-in-only search path.
-- All application relations remain schema-qualified inside the function body.
create or replace function private.has_active_self_patient_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to pg_catalog
as $$
  select exists (
    select 1
    from public.patient_profiles pp
    where pp.account_id = p_user_id
      and pp.relationship = 'self'
      and pp.archived_at is null
  );
$$;

revoke all on function private.has_active_self_patient_profile(uuid) from public, anon, authenticated;
grant execute on function private.has_active_self_patient_profile(uuid) to authenticated;
