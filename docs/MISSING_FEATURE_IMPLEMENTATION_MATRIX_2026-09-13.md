# Missing marketplace feature implementation matrix — 2026-09-13

## Scope
Only gaps verified against the production repository at `e2d96c4d483cb6d7dfd1d71086b65026d8f10e1c` are listed. Existing search, offer comparison, availability, booking, cancellation, account, attendance and analytics responsibilities remain unchanged.

| ID | Gap | Priority | Acceptance criterion | Status |
|---|---|---|---|---|
| WL-01 | Cancellation waitlist for a clinic offer | P1 | Authenticated patient with a complete, phone-verified profile can join one active waitlist entry per patient/offer and receives a stable queue position; duplicate joins are idempotent | Backend schema/RPC implemented in production; UI/API pending verification |
| WL-02 | Slot-open notification after cancellation | P1 | When a booking cancellation releases a slot, matching active waitlist entries receive one deduplicated in-app notification; no automatic rebooking | NOT VERIFIED |
| RS-01 | Patient rescheduling | P1 | Eligible future booking can atomically move to a currently bookable compatible slot without double-booking and retains audit/history | NOT VERIFIED |
| NA-01 | Next-available workflow | P1 | When the selected offer has no slot, the UI offers an explicit next-available/waitlist path; backend remains authoritative for availability | NOT VERIFIED |
| WL-03 | Waitlist cancellation/withdrawal | P2 | Patient can withdraw an active waitlist entry; repeated withdrawal is idempotent | NOT VERIFIED |
| AN-01 | Clinic commercial KPIs | P2 | Clinic/admin can see verified views, searches, booking conversion, cancellations, no-shows, filled cancellations and new-patient counts from authoritative events | Partially present; full KPI acceptance NOT VERIFIED |
| RV-01 | Verified reviews activation | P2 | Review is accepted only for eligible completed attendance and appears publicly only after required verification state | Feature flag exists; end-to-end activation NOT VERIFIED |
| PAY-01 | Online payments | P3 | Payment provider, webhook verification, payment state machine, reconciliation and booking gating are all live and tested | Explicitly not enabled; NOT VERIFIED |
| ETA-01 | Arrival-time estimate | P3 | Route-based ETA is displayed only when location/address data is authoritative and current; otherwise no fabricated ETA | NOT VERIFIED |

## WL-01 technical binding
- Route: `/api/waitlist` — POST — pending source integration in the application branch.
- Input: `offer_id`, `patient_profile_id`.
- Success: `201 {waitlist_id, waitlist_status, queue_position}`.
- Errors: `401` unauthenticated, `400` invalid/incomplete profile, `403` ownership violation, `409` ineligible offer, `503` operational failure.
- Table: `public.booking_waitlist`.
- Constraints: FK to `auth.users`, `patient_profiles`, `branch_service_offers`, `treatment_variants`; partial unique index on active `(patient_profile_id, offer_id)`; RLS enabled.
- RPC: `public.join_booking_waitlist_server(actor, offer, patient_profile)`; ownership and profile-completeness checks are server-side.

## Rollback
The committed migration contains the inverse DDL for the waitlist table, indexes, policies, function and cancellation notification hook. Production schema changes must be rolled back only through a reviewed migration, never by deleting migration history.

## Testing gate
Do not mark a row VERIFIED until the repository CI (`typecheck`, `lint`, `test`, `build`, change gate) and production browser E2E prove the complete user journey with real authoritative data. No synthetic production patient data may be used.
