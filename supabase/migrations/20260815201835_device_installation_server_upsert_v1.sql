-- Server-only device registry upsert. Anonymous heartbeats must not erase an
-- existing account association; authenticated use may refresh/reassign the
-- current association because a device is a signal, never a patient identity.

create or replace function public.register_device_installation_server(
  p_account_id uuid,
  p_installation_id uuid,
  p_device_label text,
  p_platform text,
  p_browser text,
  p_device_class text,
  p_app_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_installation_id is null then
    raise exception 'installation id required' using errcode = '22023';
  end if;

  if p_device_class not in ('mobile', 'tablet', 'desktop', 'unknown') then
    raise exception 'invalid device class' using errcode = '22023';
  end if;

  insert into public.device_installations(
    installation_id,
    account_id,
    device_label,
    platform,
    browser,
    device_class,
    app_version,
    first_seen_at,
    last_seen_at
  )
  values (
    p_installation_id,
    p_account_id,
    nullif(btrim(coalesce(p_device_label, '')), ''),
    nullif(btrim(coalesce(p_platform, '')), ''),
    nullif(btrim(coalesce(p_browser, '')), ''),
    p_device_class,
    nullif(btrim(coalesce(p_app_version, '')), ''),
    now(),
    now()
  )
  on conflict (installation_id) do update
  set
    account_id = coalesce(excluded.account_id, device_installations.account_id),
    device_label = coalesce(excluded.device_label, device_installations.device_label),
    platform = coalesce(excluded.platform, device_installations.platform),
    browser = coalesce(excluded.browser, device_installations.browser),
    device_class = excluded.device_class,
    app_version = coalesce(excluded.app_version, device_installations.app_version),
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_device_installation_server(uuid,uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.register_device_installation_server(uuid,uuid,text,text,text,text,text) to service_role;

comment on function public.register_device_installation_server(uuid,uuid,text,text,text,text,text) is
  'Server-only idempotent device installation upsert. Anonymous heartbeats preserve an existing account association; device records are operational signals, not patient identity.';
