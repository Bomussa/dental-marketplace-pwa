# PR #28 — Release verification update — 2026-09-14

## Changes completed

- Added a production-alignment migration that revokes direct `anon`/`authenticated` access to `public.booking_waitlist`.
- Removed legacy waitlist INSERT policies from the production database.
- Restricted `join_booking_waitlist_server(uuid, uuid, uuid)` execution to `service_role`.
- Restricted `withdraw_booking_waitlist_server(uuid, uuid)` execution to `service_role`.
- Hardened the account waitlist read component so a failed optional waitlist read is surfaced as an explicit unavailable state instead of being silently converted to an empty list.

## Production database

The security alignment migration was applied successfully to Supabase production project `bqvcukxfsnchvkgejolz` on 2026-09-14.

## Verification

- Production migration application: successful.
- Production runtime error aggregation: no runtime errors in the selected last-hour window at the time of verification.
- Vercel generated preview deployments for PR #28 after the commits.
- PR #28 is currently reported by GitHub as `mergeable: true` but remains open and unmerged because the repository requires an approving review.
- The latest branch head must pass a fresh CI/Vercel cycle before release is considered complete.

## Important release boundary

This file does not claim that PR #28 is production-released. Production remains the last merged `main` deployment until PR #28 is merged and the resulting production deployment reaches `READY`.

## Database migration policy

All production schema/security changes must remain represented by version-controlled migrations. Supabase documents that direct production schema changes bypass migration history and can create sync errors; migrations should be tested and deployed through the version-controlled workflow.
