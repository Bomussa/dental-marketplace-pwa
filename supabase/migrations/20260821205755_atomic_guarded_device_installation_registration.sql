create or replace function public.register_device_installation_guarded_server(
  p_account_id uuid,
  p_installation_id uuid,
  p_device_label text,
  p_platform text,
  p_browser text,
  p_device_class text,
  p_app_version text,
  p_client_subject_key text,
  p_installation_subject_key text
)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_allowed boolean;
begin
  if p_client_subject_key is null or p_client_subject_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid client rate-limit subject' using errcode = '22023';
  end if;

  if p_installation_subject_key is null or p_installation_subject_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid installation rate-limit subject' using errcode = '22023';
  end if;

  v_allowed := public.consume_rate_limit_server(
    'device_installation',
    p_client_subject_key,
    20,
    60
  );
  if not v_allowed then
    return 'client_rate_limited';
  end if;

  v_allowed := public.consume_rate_limit_server(
    'device_installation',
    p_installation_subject_key,
    60,
    3600
  );
  if not v_allowed then
    return 'installation_rate_limited';
  end if;

  perform public.register_device_installation_server(
    p_account_id,
    p_installation_id,
    p_device_label,
    p_platform,
    p_browser,
    p_device_class,
    p_app_version
  );

  return 'ok';
end;
$function$;

revoke all on function public.register_device_installation_guarded_server(uuid, uuid, text, text, text, text, text, text, text) from public;
revoke all on function public.register_device_installation_guarded_server(uuid, uuid, text, text, text, text, text, text, text) from anon;
revoke all on function public.register_device_installation_guarded_server(uuid, uuid, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.register_device_installation_guarded_server(uuid, uuid, text, text, text, text, text, text, text) to service_role;
