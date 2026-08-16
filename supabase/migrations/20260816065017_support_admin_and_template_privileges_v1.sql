-- Least-privilege Admin support content and notification template access.

revoke insert, update, delete, truncate, references, trigger
on table public.support_knowledge_articles from anon;

revoke delete, truncate, references, trigger
on table public.support_knowledge_articles from authenticated;

grant select on table public.support_knowledge_articles to anon;
grant select, insert, update on table public.support_knowledge_articles to authenticated;

drop policy if exists "support knowledge admin manage" on public.support_knowledge_articles;
create policy "support knowledge admin manage"
on public.support_knowledge_articles
for all
to authenticated
using (coalesce(((select auth.jwt())->'app_metadata'->>'platform_admin')::boolean,false))
with check (coalesce(((select auth.jwt())->'app_metadata'->>'platform_admin')::boolean,false));

revoke select, insert, update, delete, truncate, references, trigger
on table public.notification_templates from anon;

revoke delete, truncate, references, trigger
on table public.notification_templates from authenticated;

grant select, insert, update on table public.notification_templates to authenticated;

comment on policy "support knowledge admin manage" on public.support_knowledge_articles is
  'Platform admins may create, approve, and archive governed knowledge; anonymous readers remain limited by the approved-public SELECT policy.';
