# DEV verification report — 2026-08-14

## Passed against live Supabase DEV

- Security Advisor: **0 security lints** after the final RLS/auth hardening.
- Exact-variant search under `anon`: 3 Root Canal — Molar offers returned in price order (450 / 600 / 700–900 QAR).
- PostGIS radius: 1 km query around the first synthetic point returned exactly 1 result.
- Verification activation gate: unverified clinic activation was blocked by a database trigger.
- Idempotency: same patient + same key returned the same booking ID.
- Price snapshot: booking captured `min_minor=45000` and mutation was blocked.
- Duplicate slot: a second patient could not claim the same active slot.
- Tenant isolation: Alpha receptionist saw Alpha membership/verification and 0 Beta membership/verification rows.
- Actor-aware booking state: patient could not self-confirm; patient cancellation succeeded.
- Slot lifecycle: patient cancellation re-published a still-valid held slot.
- Verified review flow: completed visit -> patient review pending -> patient self-publish blocked -> platform admin publish -> public search reflected rating.
- Performance Advisor: no WARN items after policy consolidation; remaining entries were INFO-only unused-index notices expected on a fresh DEV database.

## Local code checks

- TypeScript transpile/syntax pass: 34 TS/TSX files, 0 syntax diagnostics using the globally available TypeScript compiler.
- `npm install`, full `tsc`, Vitest and Playwright execution were **not completed** because the execution container could not resolve `registry.npmjs.org` (`EAI_AGAIN`). No false “green build” claim is made.

## Still required before production

- Materialize exact remote migration SQL locally (`supabase db pull`) once the CLI/package registry is reachable.
- Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then Playwright against Preview.
- Run true concurrent booking race (50–100 simultaneous attempts); current DB tests prove invariants sequentially, not load concurrency.
- Configure Supabase Auth Site URL / redirect URLs for the final Vercel domain and test magic-link delivery.
- Create/link the new GitHub repository and Vercel project; existing unrelated projects were not reused.
