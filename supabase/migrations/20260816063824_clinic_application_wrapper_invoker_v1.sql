-- Keep the exposed public RPC as SECURITY INVOKER so the API surface does not
-- run with owner privileges. The validated privileged implementation remains in
-- the non-public private schema and is callable only by authenticated users.

alter function public.create_clinic_application(text,text) security invoker;
alter function public.create_clinic_application(text,text) set search_path = '';
revoke all on function public.create_clinic_application(text,text) from public, anon, authenticated;
grant execute on function public.create_clinic_application(text,text) to authenticated;

revoke execute on function private.create_clinic_application_internal(text,text) from public, anon;
grant execute on function private.create_clinic_application_internal(text,text) to authenticated;

comment on function public.create_clinic_application(text,text) is
  'Authenticated SECURITY INVOKER wrapper; validated privileged implementation lives in private schema.';
