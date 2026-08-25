-- Keep authenticated RPC access only for browser-facing workflows that rely on auth.uid()
-- and are exercised directly by the application. All operational, financial, attendance,
-- booking, password-reset, and provisioning procedures stay service-role only.

revoke execute on all functions in schema public from authenticated;

grant execute on all functions in schema public to service_role;

-- Visitor and clinic application workflows that intentionally evaluate the caller's JWT.
grant execute on function public.admin_customer_choice_analytics(integer) to authenticated;
grant execute on function public.create_clinic_application(text, text) to authenticated;
grant execute on function public.create_branch_application(uuid, text, text, text, double precision, double precision) to authenticated;
grant execute on function public.clinic_booking_patient_details(uuid[]) to authenticated;

-- Non-SECURITY DEFINER validation helpers can be needed when an authenticated role
-- submits a row that is validated by a database constraint or trigger.
grant execute on function public.is_price_scope_publishable(jsonb) to authenticated;
grant execute on function public.is_valid_price_scope(jsonb) to authenticated;
