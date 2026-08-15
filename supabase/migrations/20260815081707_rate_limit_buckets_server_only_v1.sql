-- Atomic server-only fixed-window rate limits for destructive and high-frequency routes.

create table if not exists public.rate_limit_buckets (
  scope text not null,
  subject_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_key, window_started_at),
  constraint rate_limit_buckets_scope_check check (char_length(btrim(scope)) between 3 and 80),
  constraint rate_limit_buckets_subject_check check (char_length(btrim(subject_key)) between 3 and 160),
  constraint rate_limit_buckets_count_check check (request_count >= 0),
  constraint rate_limit_buckets_expiry_check check (expires_at > window_started_at)
);

create index if not exists rate_limit_buckets_expiry_idx
  on public.rate_limit_buckets(expires_at);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create policy rate_limit_buckets_no_client_access
  on public.rate_limit_buckets
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.consume_rate_limit_server(
  p_scope text,
  p_subject_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_started_at timestamptz;
  v_consumed boolean;
begin
  if char_length(btrim(coalesce(p_scope, ''))) not between 3 and 80 then
    raise exception 'invalid rate-limit scope' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_subject_key, ''))) not between 3 and 160 then
    raise exception 'invalid rate-limit subject' using errcode = '22023';
  end if;
  if p_limit not between 1 and 1000 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate-limit configuration' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  delete from public.rate_limit_buckets
  where scope = p_scope
    and expires_at < now();

  insert into public.rate_limit_buckets(
    scope, subject_key, window_started_at, request_count, expires_at
  ) values (
    p_scope, p_subject_key, v_window_started_at, 1,
    v_window_started_at + make_interval(secs => p_window_seconds)
  )
  on conflict (scope, subject_key, window_started_at) do update
    set request_count = public.rate_limit_buckets.request_count + 1,
        updated_at = now()
    where public.rate_limit_buckets.request_count < p_limit
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;

revoke all on function public.consume_rate_limit_server(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit_server(text,text,integer,integer) to service_role;
