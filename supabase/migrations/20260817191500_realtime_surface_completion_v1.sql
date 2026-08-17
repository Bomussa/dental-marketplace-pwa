-- Complete event-driven refresh coverage for the account and admin operational surfaces.
alter table public.patient_profiles replica identity full;
alter table public.profiles replica identity full;
alter table public.reviews replica identity full;
alter table public.offer_revisions replica identity full;
alter table public.price_disputes replica identity full;
alter table public.clinics replica identity full;
alter table public.branches replica identity full;
alter table public.practitioners replica identity full;
alter table public.notification_templates replica identity full;
alter table public.support_knowledge_articles replica identity full;
alter table public.settlement_periods replica identity full;

alter publication supabase_realtime add table
  public.patient_profiles,
  public.profiles,
  public.reviews,
  public.offer_revisions,
  public.price_disputes,
  public.clinics,
  public.branches,
  public.practitioners,
  public.notification_templates,
  public.support_knowledge_articles,
  public.settlement_periods;
