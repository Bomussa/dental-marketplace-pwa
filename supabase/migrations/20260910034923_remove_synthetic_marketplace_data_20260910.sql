-- Production cleanup: remove development/QA marketplace entities only.
-- Treatment catalog and treatment variants are intentionally preserved.
-- No real clinic, offer, availability slot, or booking existed at the time of this cleanup.

create temp table _synthetic_clinics on commit drop as
select id from public.clinics where is_synthetic = true;

create temp table _synthetic_branches on commit drop as
select b.id from public.branches b join _synthetic_clinics c on c.id = b.clinic_id;

create temp table _synthetic_offers on commit drop as
select o.id from public.branch_service_offers o join _synthetic_branches b on b.id = o.branch_id;

create temp table _synthetic_slots on commit drop as
select s.id from public.availability_slots s join _synthetic_branches b on b.id = s.branch_id;

delete from public.customer_choice_events where offer_id in (select id from _synthetic_offers) or slot_id in (select id from _synthetic_slots);
delete from public.offer_revisions where offer_id in (select id from _synthetic_offers);
delete from public.instant_slots where offer_id in (select id from _synthetic_offers) or slot_id in (select id from _synthetic_slots);
delete from public.availability_slots where id in (select id from _synthetic_slots);
delete from public.price_disputes where offer_id in (select id from _synthetic_offers) or branch_id in (select id from _synthetic_branches);
delete from public.branch_service_offers where id in (select id from _synthetic_offers);
delete from public.clinic_memberships where clinic_id in (select id from _synthetic_clinics) or branch_id in (select id from _synthetic_branches);
delete from public.practitioners where clinic_id in (select id from _synthetic_clinics);
delete from public.branch_hours where branch_id in (select id from _synthetic_branches);
delete from public.branch_hour_exceptions where branch_id in (select id from _synthetic_branches);
delete from public.resources where branch_id in (select id from _synthetic_branches);
delete from public.clinic_fee_rules where clinic_id in (select id from _synthetic_clinics) or branch_id in (select id from _synthetic_branches);
delete from public.accounting_journals where clinic_id in (select id from _synthetic_clinics) or branch_id in (select id from _synthetic_branches);
delete from public.report_exports where clinic_id in (select id from _synthetic_clinics);
delete from public.settlement_periods where clinic_id in (select id from _synthetic_clinics);
delete from public.clinic_operator_account_events where clinic_id in (select id from _synthetic_clinics);
delete from public.clinic_operator_accounts where clinic_id in (select id from _synthetic_clinics);
delete from public.reviews where clinic_id in (select id from _synthetic_clinics);
delete from public.branches where id in (select id from _synthetic_branches);
delete from public.clinics where id in (select id from _synthetic_clinics);
