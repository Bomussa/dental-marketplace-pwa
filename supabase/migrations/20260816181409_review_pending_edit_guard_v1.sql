create or replace function private.guard_review_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_privileged boolean := (auth.uid() is null) or private.is_platform_admin();
begin
  if v_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'new review must start pending' using errcode='42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.status <> 'pending' then
      raise exception 'only pending reviews can be edited by patient' using errcode='42501';
    end if;

    if new.status is distinct from old.status then
      raise exception 'review moderation status is admin-only' using errcode='42501';
    end if;

    if new.booking_id is distinct from old.booking_id
       or new.patient_id is distinct from old.patient_id
       or new.clinic_id is distinct from old.clinic_id
       or new.practitioner_id is distinct from old.practitioner_id then
      raise exception 'review ownership fields are immutable' using errcode='42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.guard_review_status() from public, anon, authenticated;

comment on function private.guard_review_status() is
  'Review integrity guard: non-privileged actors may edit content only while a review is pending; ownership and moderation fields remain protected.';
