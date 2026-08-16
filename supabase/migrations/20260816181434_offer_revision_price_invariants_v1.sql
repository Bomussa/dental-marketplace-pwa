create or replace function public.request_offer_revision_server(p_actor_id uuid, p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare current_offer public.branch_service_offers%rowtype; next_revision integer; revision_id uuid; proposed jsonb;
begin
  if p_actor_id is null then raise exception 'verified actor is required' using errcode = '28000'; end if;
  if p_price_type not in ('fixed','from','range','package','consultation_required') or p_duration_minutes not between 5 and 480 then raise exception 'invalid offer values' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a revision reason is required' using errcode = '22023'; end if;
  select o.* into current_offer from public.branch_service_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer not found' using errcode='P0002'; end if;
  if not private.has_clinic_role_for_actor(p_actor_id,(select b.clinic_id from public.branches b where b.id=current_offer.branch_id),current_offer.branch_id,array['owner','manager','pricing_manager']) then raise exception 'not authorized for this offer' using errcode='42501'; end if;
  if p_price_type = 'consultation_required' and (p_min_minor is not null or p_max_minor is not null) then raise exception 'consultation-required price cannot carry amounts' using errcode='22023'; end if;
  if p_price_type = 'fixed' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is null or p_max_minor <> p_min_minor) then raise exception 'fixed price requires equal non-negative minimum and maximum' using errcode='22023'; end if;
  if p_price_type = 'range' and (p_min_minor is null or p_max_minor is null or p_min_minor < 0 or p_max_minor < p_min_minor) then raise exception 'invalid price range' using errcode='22023'; end if;
  if p_price_type = 'from' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'from price requires one non-negative minimum' using errcode='22023'; end if;
  if p_price_type = 'package' and (p_min_minor is null or p_min_minor < 0 or (p_max_minor is not null and p_max_minor < p_min_minor)) then raise exception 'invalid package price' using errcode='22023'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.offer_revisions where offer_id=p_offer_id;
  proposed:=jsonb_build_object('price_type',p_price_type,'min_minor',p_min_minor,'max_minor',p_max_minor,'duration_minutes',p_duration_minutes);
  insert into public.offer_revisions(offer_id,revision_no,previous_snapshot,proposed_snapshot,reason,status,requested_by)
  values(p_offer_id,next_revision,to_jsonb(current_offer),proposed,p_reason,'submitted',p_actor_id) returning id into revision_id;
  return revision_id;
end;
$$;

create or replace function public.request_offer_revision(p_offer_id uuid, p_price_type text, p_min_minor integer, p_max_minor integer, p_duration_minutes integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare current_offer public.branch_service_offers%rowtype; next_revision integer; revision_id uuid; proposed jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_price_type not in ('fixed','from','range','package','consultation_required') or p_duration_minutes not between 5 and 480 then raise exception 'invalid offer values' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'a revision reason is required' using errcode = '22023'; end if;
  select o.* into current_offer from public.branch_service_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer not found' using errcode='P0002'; end if;
  if not private.has_clinic_role((select b.clinic_id from public.branches b where b.id=current_offer.branch_id),current_offer.branch_id,array['owner','manager','pricing_manager']) then raise exception 'not authorized for this offer' using errcode='42501'; end if;
  if p_price_type = 'consultation_required' and (p_min_minor is not null or p_max_minor is not null) then raise exception 'consultation-required price cannot carry amounts' using errcode='22023'; end if;
  if p_price_type = 'fixed' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is null or p_max_minor <> p_min_minor) then raise exception 'fixed price requires equal non-negative minimum and maximum' using errcode='22023'; end if;
  if p_price_type = 'range' and (p_min_minor is null or p_max_minor is null or p_min_minor < 0 or p_max_minor < p_min_minor) then raise exception 'invalid price range' using errcode='22023'; end if;
  if p_price_type = 'from' and (p_min_minor is null or p_min_minor < 0 or p_max_minor is not null) then raise exception 'from price requires one non-negative minimum' using errcode='22023'; end if;
  if p_price_type = 'package' and (p_min_minor is null or p_min_minor < 0 or (p_max_minor is not null and p_max_minor < p_min_minor)) then raise exception 'invalid package price' using errcode='22023'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.offer_revisions where offer_id=p_offer_id;
  proposed:=jsonb_build_object('price_type',p_price_type,'min_minor',p_min_minor,'max_minor',p_max_minor,'duration_minutes',p_duration_minutes);
  insert into public.offer_revisions(offer_id,revision_no,previous_snapshot,proposed_snapshot,reason,status,requested_by)
  values(p_offer_id,next_revision,to_jsonb(current_offer),proposed,p_reason,'submitted',auth.uid()) returning id into revision_id;
  return revision_id;
end;
$$;
