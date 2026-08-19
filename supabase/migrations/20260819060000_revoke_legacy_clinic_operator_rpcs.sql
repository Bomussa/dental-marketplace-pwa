-- Application code now uses the *_server functions via the server-only Supabase client.
-- Retire legacy public RPC entry points so they cannot be called by API roles.

revoke all on function public.provision_clinic_operator_account(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.list_clinic_operator_accounts(uuid) from public, anon, authenticated, service_role;
revoke all on function public.revoke_clinic_operator_account(uuid) from public, anon, authenticated, service_role;
revoke all on function public.audit_clinic_operator_password_reset(uuid) from public, anon, authenticated, service_role;
