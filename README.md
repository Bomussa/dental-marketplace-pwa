# Qatar Dental DEV

Production-oriented DEV implementation of the Qatar dental price comparison, availability and booking MVP.

## Local setup

1. Copy `.env.example` to `.env.local` and fill the Supabase project URL + publishable key.
2. `npm install`
3. `npm run typecheck && npm test && npm run build`
4. `npm run dev`

## Security model

- Supabase RLS on all exposed tables.
- No service-role key in the browser or repository.
- Clinic tenancy enforced in PostgreSQL policies.
- Platform admin authorization uses trusted `app_metadata.platform_admin`.
- Booking is atomic in PostgreSQL and snapshots the exact offer price.
- Payment is feature-gated and disabled by default (`pay_at_clinic`).
- DEV must use synthetic data only.

## Current release gates

This repository is a DEV build. Public production release and real payments stay gated until the project's legal/commercial launch gates are satisfied and the deployment environment is configured.

## Live DEV verification

The connected Supabase DEV project has the schema/RLS/booking engine applied and has passed the database acceptance probes documented in `docs/TEST_REPORT.md`. The repository deliberately contains no service-role secret.

The exact remote migration history is listed in `supabase/REMOTE_APPLIED_MIGRATIONS.md`; pull the canonical remote schema before production promotion because the management connector cannot download applied migration bodies.
