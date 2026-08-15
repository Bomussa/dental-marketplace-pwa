-- Notification outbox and governed support knowledge core.
-- Provider credentials and outbound delivery remain disabled until separately configured.

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email','sms','push')),
  purpose text not null check (purpose in ('transactional','marketing')),
  enabled boolean not null default false,
  destination_ref text,
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, purpose),
  check ((enabled = false) or (consented_at is not null and revoked_at is null))
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null check (template_key ~ '^[a-z0-9_.-]{3,80}$'),
  channel text not null check (channel in ('email','sms','push')),
  locale text not null check (locale in ('ar','en')),
  version integer not null default 1 check (version > 0),
  subject text check (subject is null or char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, channel, locale, version)
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  template_id uuid references public.notification_templates(id) on delete restrict,
  event_type text not null check (event_type in ('booking_confirmed','booking_cancelled','booking_updated','attendance_recorded','price_updated','support_reply','manual')),
  event_id text not null,
  channel text not null check (channel in ('email','sms','push')),
  locale text not null check (locale in ('ar','en')),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null check (char_length(dedupe_key) between 12 and 160),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','suppressed','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 10),
  next_attempt_at timestamptz not null default now(),
  provider text,
  provider_message_id text,
  last_error_code text,
  last_error_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create unique index if not exists notification_outbox_provider_message_idx
  on public.notification_outbox(provider, provider_message_id)
  where provider is not null and provider_message_id is not null;

create index if not exists notification_outbox_dispatch_idx
  on public.notification_outbox(status, next_attempt_at, created_at)
  where status in ('pending','failed');
create index if not exists notification_outbox_recipient_idx
  on public.notification_outbox(recipient_user_id, created_at desc);

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox(id) on delete restrict,
  attempt_no integer not null check (attempt_no > 0 and attempt_no <= 10),
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('accepted','delivered','failed','rejected','suppressed')),
  error_code text,
  error_detail text check (error_detail is null or char_length(error_detail) <= 1000),
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (outbox_id, attempt_no)
);

create unique index if not exists notification_delivery_provider_message_idx
  on public.notification_delivery_attempts(provider, provider_message_id)
  where provider_message_id is not null;

create index if not exists notification_delivery_attempts_outbox_idx
  on public.notification_delivery_attempts(outbox_id, attempted_at desc);

create table if not exists public.support_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{3,100}$'),
  locale text not null check (locale in ('ar','en')),
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(title) between 3 and 200),
  body_markdown text not null check (char_length(body_markdown) between 10 and 20000),
  category text not null check (category in ('booking','pricing','availability','account','clinic','policy','safety')),
  audience text not null default 'public' check (audience in ('public','clinic','admin')),
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale, version),
  check ((status <> 'approved') or (approved_by is not null and approved_at is not null))
);

create index if not exists support_knowledge_active_idx
  on public.support_knowledge_articles(locale, audience, category)
  where status = 'approved';

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  locale text not null check (locale in ('ar','en')),
  status text not null default 'open' check (status in ('open','escalated','closed')),
  safety_category text check (safety_category is null or safety_category in ('standard','medical','emergency','privacy','billing','abuse')),
  escalation_reason text check (escalation_reason is null or char_length(escalation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists support_conversations_user_idx
  on public.support_conversations(user_id, status, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete restrict,
  role text not null check (role in ('user','assistant','system','human_agent')),
  content text not null check (char_length(content) between 1 and 6000),
  policy_version text,
  safety_category text check (safety_category is null or safety_category in ('standard','medical','emergency','privacy','billing','abuse')),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_idx
  on public.support_messages(conversation_id, created_at);

alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.notification_delivery_attempts enable row level security;
alter table public.support_knowledge_articles enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

create policy "users manage own notification preferences" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notification templates admin only" on public.notification_templates
  for all using (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "users read own notification outbox" on public.notification_outbox
  for select using (recipient_user_id = auth.uid() or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "notification attempts admin only" on public.notification_delivery_attempts
  for select using (coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "approved public knowledge is readable" on public.support_knowledge_articles
  for select using (status = 'approved' and audience = 'public' or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));

create policy "support conversations belong to user" on public.support_conversations
  for select using (user_id = auth.uid() or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false));
create policy "users open their support conversations" on public.support_conversations
  for insert with check (user_id = auth.uid() and status = 'open');
create policy "users close their support conversations" on public.support_conversations
  for update using (user_id = auth.uid() and status in ('open','escalated'))
  with check (user_id = auth.uid() and status = 'closed');

create policy "support messages visible to conversation owner" on public.support_messages
  for select using (exists (
    select 1 from public.support_conversations c
    where c.id = support_messages.conversation_id and (c.user_id = auth.uid() or coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false))
  ));
create policy "users add their own support questions" on public.support_messages
  for insert with check (role = 'user' and exists (
    select 1 from public.support_conversations c
    where c.id = support_messages.conversation_id and c.user_id = auth.uid() and c.status = 'open'
  ));
