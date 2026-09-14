# PR #28 — Release verification update — 2026-09-14

## Changes completed

- Added a production-alignment migration that revokes direct `anon`/`authenticated` access to `public.booking_waitlist`.
- Removed legacy waitlist INSERT policies from the production database.
- Restricted `join_booking_waitlist_server(uuid, uuid, uuid)` execution to `service_role`.
- Restricted `withdraw_booking_waitlist_server(uuid, uuid)` execution to `service_role`.
- Hardened the account waitlist read component so an unavailable optional waitlist read cannot crash the account page.

## Production database

The security alignment migration was applied successfully to Supabase production project `bqvcukxfsnchvkgejolz` on 2026-09-14.

## Verification

- Production migration application: successful.
- Production runtime error aggregation: no runtime errors in the selected last-hour window.
- Vercel generated a new preview deployment for PR #28 after the commits.
- PR #28 remains intentionally unmerged because GitHub currently reports it as not mergeable and the repository requires an approving review. Production must not be promoted until that gate is satisfied.

## Important release boundary

This file does not claim that PR #28 is production-released. The current production deployment remains the last merged `main` deployment until PR #28 is merged and a new production deployment reaches `READY`.

## Database migration policy

All production schema/security changes must remain represented by version-controlled migrations. Supabase documents that direct production schema changes bypass migration history and can create sync errors; migrations should be tested and deployed through the version-controlled workflow.
