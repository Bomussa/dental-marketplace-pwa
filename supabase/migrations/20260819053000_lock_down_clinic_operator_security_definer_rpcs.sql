-- Clinic operator RPCs validate ownership internally, but they must never be callable by the anonymous API role.
-- The clinic dashboard invokes them with the signed-in user's JWT, so authenticated execution remains required.

revoke all on function public.provision_clinic_operator_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.provision_clinic_operator_account(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.list_clinic_operator_accounts(uuid) from public, anon, authenticated;
grant execute on function public.list_clinic_operator_accounts(uuid) to authenticated, service_role;

revoke all on function public.revoke_clinic_operator_account(uuid) from public, anon, authenticated;
grant execute on function public.revoke_clinic_operator_account(uuid) to authenticated, service_role;

revoke all on function public.audit_clinic_operator_password_reset(uuid) from public, anon, authenticated;
grant execute on function public.audit_clinic_operator_password_reset(uuid) to authenticated, service_role;
