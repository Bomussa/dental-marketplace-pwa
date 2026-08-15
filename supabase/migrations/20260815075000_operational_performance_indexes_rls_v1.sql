-- Cover operational foreign keys and prevent repeated auth function evaluation in RLS policies.
-- Access semantics remain unchanged; only evaluation strategy and lookup performance are improved.

create index if not exists accounting_journals_branch_id_idx on public.accounting_journals(branch_id);
create index if not exists accounting_journals_created_by_idx on public.accounting_journals(created_by);
create index if not exists accounting_journals_posted_by_idx on public.accounting_journals(posted_by);
create index if not exists accounting_journals_reversed_journal_id_idx on public.accounting_journals(reversed_journal_id);
create index if not exists booking_attendance_events_recorded_by_idx on public.booking_attendance_events(recorded_by);
create index if not exists clinic_fee_rules_branch_id_idx on public.clinic_fee_rules(branch_id);
create index if not exists clinic_fee_rules_created_by_idx on public.clinic_fee_rules(created_by);
create index if not exists notification_outbox_created_by_idx on public.notification_outbox(created_by);
create index if not exists notification_outbox_template_id_idx on public.notification_outbox(template_id);
create index if not exists notification_templates_created_by_idx on public.notification_templates(created_by);
create index if not exists offer_revisions_requested_by_idx on public.offer_revisions(requested_by);
create index if not exists offer_revisions_reviewed_by_idx on public.offer_revisions(reviewed_by);
create index if not exists report_exports_clinic_id_idx on public.report_exports(clinic_id);
create index if not exists report_exports_settlement_period_id_idx on public.report_exports(settlement_period_id);
create index if not exists settlement_periods_approved_by_idx on public.settlement_periods(approved_by);
create index if not exists settlement_periods_closed_by_idx on public.settlement_periods(closed_by);
create index if not exists settlement_periods_created_by_idx on public.settlement_periods(created_by);
create index if not exists support_knowledge_articles_approved_by_idx on public.support_knowledge_articles(approved_by);
create index if not exists support_knowledge_articles_created_by_idx on public.support_knowledge_articles(created_by);

-- Finance and attendance policies.
drop policy if exists "offer revisions visible to related clinic" on public.offer_revisions;
create policy "offer revisions visible to related clinic" on public.offer_revisions
  for select using (
    exists (
      select 1 from public.branch_service_offers o
      join public.branches b on b.id = o.branch_id
      join public.clinic_memberships cm on cm.clinic_id = b.clinic_id
      where o.id = offer_revisions.offer_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
    )
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

drop policy if exists "attendance visible to related clinic" on public.booking_attendance_events;
create policy "attendance visible to related clinic" on public.booking_attendance_events
  for select using (
    exists (
      select 1 from public.bookings b
      join public.clinic_memberships cm on cm.clinic_id = b.clinic_id
      where b.id = booking_attendance_events.booking_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
    )
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

drop policy if exists "clinic fee rules admin only" on public.clinic_fee_rules;
create policy "clinic fee rules admin only" on public.clinic_fee_rules
  for all using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false))
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false));

drop policy if exists "settlement periods admin or clinic owner read" on public.settlement_periods;
create policy "settlement periods admin or clinic owner read" on public.settlement_periods
  for select using (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
    or exists (
      select 1 from public.clinic_memberships cm
      where cm.clinic_id = settlement_periods.clinic_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
        and cm.role in ('owner', 'manager')
    )
  );

drop policy if exists "journals admin or clinic owner read" on public.accounting_journals;
create policy "journals admin or clinic owner read" on public.accounting_journals
  for select using (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
    or exists (
      select 1 from public.clinic_memberships cm
      where cm.clinic_id = accounting_journals.clinic_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
        and cm.role in ('owner', 'manager')
    )
  );

drop policy if exists "journal lines follow visible journal" on public.accounting_journal_lines;
create policy "journal lines follow visible journal" on public.accounting_journal_lines
  for select using (
    exists (
      select 1 from public.accounting_journals j
      where j.id = accounting_journal_lines.journal_id
        and (
          coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
          or exists (
            select 1 from public.clinic_memberships cm
            where cm.clinic_id = j.clinic_id
              and cm.user_id = (select auth.uid())
              and cm.status = 'active'
              and cm.role in ('owner', 'manager')
          )
        )
    )
  );

drop policy if exists "report exports requester or admin" on public.report_exports;
create policy "report exports requester or admin" on public.report_exports
  for select using (
    requested_by = (select auth.uid())
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

-- Notification and support policies.
drop policy if exists "users manage own notification preferences" on public.notification_preferences;
create policy "users manage own notification preferences" on public.notification_preferences
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "notification templates admin only" on public.notification_templates;
create policy "notification templates admin only" on public.notification_templates
  for all using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false))
  with check (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false));

drop policy if exists "users read own notification outbox" on public.notification_outbox;
create policy "users read own notification outbox" on public.notification_outbox
  for select using (
    recipient_user_id = (select auth.uid())
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

drop policy if exists "notification attempts admin only" on public.notification_delivery_attempts;
create policy "notification attempts admin only" on public.notification_delivery_attempts
  for select using (coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false));

drop policy if exists "approved public knowledge is readable" on public.support_knowledge_articles;
create policy "approved public knowledge is readable" on public.support_knowledge_articles
  for select using (
    (status = 'approved' and audience = 'public')
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

drop policy if exists "support conversations belong to user" on public.support_conversations;
create policy "support conversations belong to user" on public.support_conversations
  for select using (
    user_id = (select auth.uid())
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
  );

drop policy if exists "users open their support conversations" on public.support_conversations;
create policy "users open their support conversations" on public.support_conversations
  for insert with check (user_id = (select auth.uid()) and status = 'open');

drop policy if exists "users close their support conversations" on public.support_conversations;
create policy "users close their support conversations" on public.support_conversations
  for update using (user_id = (select auth.uid()) and status in ('open', 'escalated'))
  with check (user_id = (select auth.uid()) and status = 'closed');

drop policy if exists "support messages visible to conversation owner" on public.support_messages;
create policy "support messages visible to conversation owner" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id
        and (
          c.user_id = (select auth.uid())
          or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'platform_admin')::boolean, false)
        )
    )
  );

drop policy if exists "users add their own support questions" on public.support_messages;
create policy "users add their own support questions" on public.support_messages
  for insert with check (
    role = 'user'
    and exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id
        and c.user_id = (select auth.uid())
        and c.status = 'open'
    )
  );
