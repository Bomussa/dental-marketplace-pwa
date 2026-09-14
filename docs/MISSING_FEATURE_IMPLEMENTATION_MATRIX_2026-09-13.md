# Missing marketplace feature implementation matrix — 2026-09-13

## Scope
Only gaps verified against the production repository are listed. Existing search, offer comparison, availability, booking, cancellation, account, attendance and analytics responsibilities remain unchanged.

| ID | Gap | Priority | Acceptance criterion | Status |
|---|---|---|---|---|
| WL-01 | Cancellation waitlist for a clinic offer | P1 | Authenticated patient with a complete, phone-verified profile can join one active waitlist entry per patient/offer and receives a stable queue position; duplicate joins are idempotent | Implemented in branch; CI + production verification required before VERIFIED |
| WL-02 | Slot-open notification after cancellation | P1 | When `cancel_booking_server` releases a slot, matching active waitlist entries receive one deduplicated in-app notification; no automatic rebooking | Implemented by the canonical cancellation RPC; branch UI contract verified |
| RS-01 | Patient rescheduling | P1 | Eligible future booking can atomically move to a currently bookable compatible slot without double-booking and retains audit/history | NOT VERIFIED |
| NA-01 | Next-available workflow | P1 | When the selected offer has no slot, the UI offers an explicit next-available/waitlist path; backend remains authoritative for availability | Waitlist CTA implemented; full next-available workflow NOT VERIFIED |
| WL-03 | Waitlist cancellation/withdrawal | P2 | Patient can withdraw an active waitlist entry; repeated withdrawal is idempotent | Implemented in branch; CI + production verification required before VERIFIED |
| AN-01 | Clinic commercial KPIs | P2 | Clinic/admin can see verified views, searches, booking conversion, cancellations, no-shows, filled cancellations and new-patient counts from authoritative events | Partially present; full KPI acceptance NOT VERIFIED |
| RV-01 | Verified reviews activation | P2 | Review is accepted only for eligible completed attendance and appears publicly only after required verification state | Feature flag exists; end-to-end activation NOT VERIFIED |
| PAY-01 | Online payments | P3 | Payment provider, webhook verification, payment state machine, reconciliation and booking gating are all live and tested | Explicitly not enabled; NOT VERIFIED |
| ETA-01 | Arrival-time estimate | P3 | Route-based ETA is displayed only when location/address data is authoritative and current; otherwise no fabricated ETA | NOT VERIFIED |

## WL-01 technical binding
- UI integration: existing result-page waitlist CTA and account workflow; no new `/api/waitlist` route is required.
- Join operation: Server Action `joinBookingWaitlist` → `public.join_booking_waitlist_server(actor, offer, patient_profile)`.
- Withdrawal operation: Server Action `withdrawBookingWaitlist` → `public.withdraw_booking_waitlist_server(actor, waitlist_id)`.
- Join result: `{waitlist_id, waitlist_status, queue_position}`.
- Ownership/profile checks are server-side; browser roles cannot directly execute the mutation RPCs or insert waitlist rows after the hardening migration.
- Table: `public.booking_waitlist`.
- Constraints: FK to `auth.users`, `patient_profiles`, `branch_service_offers`, `treatment_variants`; partial unique index on active `(patient_profile_id, offer_id)`; RLS enabled.

## WL-02 technical binding
- Existing canonical cancellation RPC remains `public.cancel_booking_server(actor, booking)` and remains responsible for booking/slot state transition.
- The same canonical RPC already enqueues one deduplicated `waitlist_slot_opened` in-app notification per matching active waitlist entry when it releases a held slot.
- Notification dedupe key is stable per released booking and waitlist entry.
- The waitlist entry remains active after notification so the patient can still act on a later compatible opening; no automatic rebooking occurs.
- No second cancellation trigger is introduced.

## Rollback
All schema changes are forward migrations. Rollback must use a separately reviewed inverse migration or restore procedure; migration history must never be deleted or rewritten.

## Testing gate
Do not mark a row VERIFIED until repository CI (`typecheck`, `lint`, `test`, `build`, change gate), database acceptance/security probes, and production browser E2E prove the complete user journey with authoritative test-environment data. No synthetic production patient data may be retained.