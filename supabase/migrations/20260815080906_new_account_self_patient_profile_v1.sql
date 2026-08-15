-- Guarantee that every new account gets exactly one minimal self patient profile.

create or replace function public.handle_new_account_patient_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.patient_profiles(account_id, display_name, relationship)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'أنا'),
    'self'
  )
  on conflict (account_id) where relationship = 'self' and archived_at is null do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_account_patient_profile() from public;

drop trigger if exists on_auth_user_created_patient_profile on auth.users;
create trigger on_auth_user_created_patient_profile
  after insert on auth.users
  for each row execute function public.handle_new_account_patient_profile();
