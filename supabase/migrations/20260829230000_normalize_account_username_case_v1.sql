-- Keep account usernames canonical and case-insensitive so login normalization
-- cannot diverge from stored credentials. Existing active usernames are normalized
-- first; the functional unique index prevents future case-variant duplicates.
update public.account_usernames
set username = lower(username)
where disabled_at is null
  and username <> lower(username);

create unique index if not exists account_usernames_username_lower_unique
  on public.account_usernames (lower(username));
