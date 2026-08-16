drop policy if exists "support knowledge admin manage" on public.support_knowledge_articles;

create policy "support knowledge admin insert"
on public.support_knowledge_articles
for insert
to authenticated
with check (
  coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false)
);

create policy "support knowledge admin update"
on public.support_knowledge_articles
for update
to authenticated
using (
  coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false)
)
with check (
  coalesce((((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean), false)
);
