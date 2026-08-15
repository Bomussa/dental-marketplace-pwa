-- Verification + activation is one database transaction. This prevents a
-- verification record from being committed while activation fails.

create or replace function public.verify_and_activate_server(
  p_actor_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_source text,
  p_identifier text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer := 0;
begin
  if p_actor_id is null then
    raise exception 'verified actor is required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_actor_id
      and coalesce((u.raw_app_meta_data ->> 'platform_admin')::boolean, false)
  ) then
    raise exception 'platform admin required' using errcode = '42501';
  end if;

  if p_subject_type not in ('clinic', 'branch', 'practitioner') then
    raise exception 'unsupported verification subject' using errcode = '22023';
  end if;

  if nullif(btrim(p_source), '') is null then
    raise exception 'verification source required' using errcode = '22023';
  end if;

  insert into public.verification_records(
    subject_type,
    subject_id,
    source,
    identifier,
    status,
    verified_at,
    created_by
  )
  values (
    p_subject_type,
    p_subject_id,
    btrim(p_source),
    nullif(btrim(coalesce(p_identifier, '')), ''),
    'verified',
    now(),
    p_actor_id
  );

  if p_subject_type = 'clinic' then
    update public.clinics set status = 'active' where id = p_subject_id;
  elsif p_subject_type = 'branch' then
    update public.branches set status = 'active' where id = p_subject_id;
  else
    update public.practitioners set active = true where id = p_subject_id;
  end if;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'verification target not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.verify_and_activate_server(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.verify_and_activate_server(uuid,text,uuid,text,text) to service_role;

comment on function public.verify_and_activate_server(uuid,text,uuid,text,text) is
  'Server-only atomic platform verification and activation. Requires a platform_admin actor and rolls back verification if activation fails.';
