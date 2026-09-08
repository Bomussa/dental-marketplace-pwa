# أسناني قطر — Engineering Handover & Codebase Consolidation

**Revision:** 2026-09-08  
**Authoritative branch:** `main`  
**Authoritative commit:** `d0f7adf31930613d4fb1d32d17c5594e6795b556`  
**Repository:** `Bomussa/dental-marketplace-pwa`

## 1. Purpose

هذا المستند هو نقطة الدخول لمهندس جديد. الهدف ليس تقليل عدد الملفات بأي ثمن، بل تقليل الالتباس مع إبقاء كل runtime code والاختبارات والترحيلات والأدوات التي لها وظيفة حقيقية.

قاعدة الدمج: لا يُحذف أو يُدمج ملف لمجرد تشابه الاسم. يلزم إثبات الاستخدام/عدم الاستخدام، ثم تحديث المراجع، ثم الاختبار، ثم إعادة الفحص.

## 2. Scope and exclusions

### In scope

- `Bomussa/dental-marketplace-pwa` فقط.
- الفرع المرجعي الوحيد للإصدار: `main`.
- Next.js App Router: `app/`.
- React UI: `components/`.
- shared/server logic: `lib/`.
- public assets/PWA: `public/`.
- database source of truth: `supabase/migrations/` و`supabase/baselines/`.
- tests/tooling: `tests/`, `load-tests/`, `scripts/`.
- CI/config: `.github/`, `package.json`, lockfile, Next/TypeScript/ESLint/Vitest/Playwright configuration.
- engineering documentation: `AGENTS.md`, `README.md`, `docs/`.

### Explicitly excluded

- `Bomussa/love` و`Bomussa/love-api`: مشاريع MMC-MMS منفصلة وليست جزءًا من أسناني قطر.
- `Bomussa/2027` و`Bomussa/nextjs-ai-chatbot`: مستودعات أخرى ولا تدخل في تسليم هذا المشروع.
- لا يوجد مرجع داخل المستودع الحالي إلى `Bomussa/love` أو `love-api` وفق البحث المنفذ أثناء المراجعة.

## 3. Architecture source of truth

لا تعيد اكتشاف البنية من الصفر. ابدأ بالوثائق التالية بهذا الترتيب:

1. `AGENTS.md` — قواعد العمل الآمن وحدود Production/Staging.
2. `docs/ARCHITECTURE_AND_CODE_MAP_AR.md` — خريطة الطبقات والمسارات والخوارزميات.
3. `docs/SOURCE_MANIFEST.md` — فهرس المسؤوليات التنفيذية ومصادر الحقيقة.
4. `docs/CURRENT_PRODUCTION_STATUS.md` — حالة الإصدار المنشور.
5. `docs/DEPLOYMENT_RUNBOOK.md` — النشر والرجوع.
6. `docs/MAINTENANCE_MANUAL_AR.md` — الصيانة والحوادث.

### Runtime layering

`app/` → `components/` → `lib/validation.ts` / domain guards → `lib/*.server.ts` → Supabase clients/RPC → PostgreSQL/RLS/triggers.

لا تنقل منطق الصلاحيات إلى الواجهة، ولا تكرر Zod schemas أو حراس المجال في endpoints متعددة.

## 4. Current repository structure

| Area | Rule |
|---|---|
| `app/` | Routes, pages, server actions, route handlers. |
| `components/` | Presentation and client interaction; no privilege by visual hiding. |
| `lib/` | Shared domain, validation, server operations, auth, search, booking, pricing and integration logic. |
| `supabase/migrations/` | Only source-controlled DDL/RLS/RPC/trigger changes. |
| `supabase/baselines/` | Rebuild/reference snapshots; never a production data dump. |
| `tests/` | Unit/integration/regression tests. |
| `tests/e2e/` | Browser acceptance coverage. |
| `load-tests/` | Guarded staging load/concurrency scenarios; never Production. |
| `scripts/` | Deployment/readiness/schema tooling. |
| `public/` | Public runtime assets, service worker and offline fallback. |
| `docs/` | Engineering contracts, maps, runbooks and historical evidence. |

## 5. Consolidation result

### Deleted

The completed cleanup removed **16 non-runtime files**:

- 15 presentation/planning artifacts under `presentations/asnaani-qatar-executive-status/`.
- `todo.md`.

These were removed in PR #20. No application route, component, library module, test, migration, PWA asset or package manifest was intentionally deleted.

### Merged/consolidated source modules

**0 source-code modules were merged in this handover pass.**

This is intentional. The repository already contains explicit responsibility maps and several similarly named modules that are deliberately separated by execution boundary (client/server), domain, or role. A speculative merge would increase coupling and create more risk than value.

### Important protected file

`lib/server-readiness.ts` was previously considered for deletion during the cleanup. CI proved that `tests/server-operations.test.ts` imports it directly, so it was restored and is protected from deletion. This is the acceptance rule for future cleanup: dependency proof precedes removal.

### Existing canonical modules that must remain canonical

- Search: `lib/search-query.ts` + `lib/search-offers.ts`.
- Pricing: `lib/price.ts` + `lib/price-scope.ts`.
- Validation: `lib/validation.ts`.
- Server operations: `lib/operations.server.ts`.
- Booking intent: `lib/booking-intent.client.ts`.
- Booking endpoint: `app/api/book/route.ts`.
- Auth claims: `lib/auth-claims.server.ts`.
- Account auth: `lib/account-auth.server.ts`.
- Supabase clients: `lib/supabase/`.
- UI primitives: `components/ui.tsx`.
- Icons: `components/icons.tsx`.

Do not create a second implementation beside any of these without an explicit architectural decision.

## 6. Branch consolidation

GitHub currently contains **51 branches total, including `main`**. The repository has no open pull requests at this review point. `main` is the only authoritative release branch.

### Retained intentionally

- `main` — authoritative production source.
- `backup/pre-cleanup-2026-09-08` — rollback point for the cleanup.
- `staging` — historical/staging branch referenced by the project operating rules.
- `cleanup/safe-nonruntime-2026-09-08` — historical cleanup branch; PR #20 was merged.
- `handover/consolidation-2026-09-08` — this handover work.
- `rollback/*` — historical rollback references; do not treat them as development branches.

### Stale/experimental families

The following families are not release sources and must not be merged automatically into `main` merely because their names sound relevant:

- `agent/admin-analytics-v1`
- `audit/production-readiness-20260815-pushable`
- `chore/align-supabase-migration-ledger-20260815`
- `design-v2-final`
- `design-v2-premium`
- `feat/*`
- `feature/*`
- `fix/*`
- `governance-tracking`
- `placeholder-never`
- `preview/*`
- `production-*`
- `security/preauthorize-sensitive-actions`
- `test/e2e-public-coverage-20260815`

Evidence of staleness/divergence includes, for example:

- `staging`: 22 commits behind `main`, 0 ahead.
- `fix/operational-client-workspace-20260826`: 41 behind, 0 ahead.
- `feat/mobile-pwa-experience-20260824`: 89 behind, 0 ahead.
- `production-acceptance-record`: 343 behind, 0 ahead.
- `design-v2-final`: diverged, 4 commits ahead and 341 behind; its changes are not a safe fast-forward candidate.
- `security/preauthorize-sensitive-actions`: diverged, 4 ahead and 183 behind; it must be cherry-picked/ported only after review if any change is still required.
- `feature/realtime-customer-choices`: diverged, 1 ahead and 340 behind; do not merge wholesale.

GitHub recommends deleting merged/stale branches when they are no longer needed. The current connector exposes branch creation/update but not a safe branch-delete operation, so historical branch deletion was **not** simulated by moving refs or overwriting history. Manual GitHub branch deletion can be performed after confirming no retention requirement.

## 7. Dependencies and toolchain

Current `package.json` defines:

- Next.js `^16.3.1`
- React `19.2.8`
- React DOM `19.2.8`
- Supabase JS `2.111.0`
- Supabase SSR `0.12.4`
- Zod `4.4.3`
- TypeScript `5.8.3`
- ESLint `9.39.5`
- Vitest `4.1.10`
- Playwright `1.62.0`
- axe-core Playwright `4.13.0`
- Tailwind CSS `4.3.3`

The repository uses Node `24` in CI and Vercel.

CI gates runtime and all-dependency critical vulnerabilities with `npm audit`; the completed cleanup CI recorded **0 vulnerabilities** and passed both critical gates.

## 8. Verification evidence

The cleanup branch was tested before merge and re-tested after the accidental `server-readiness.ts` deletion was corrected.

- TypeScript: PASS.
- ESLint: PASS.
- Unit tests: **30 files / 107 passed / 1 skipped**.
- Production build: PASS.
- E2E: **66/66 passed**.
- Repeat E2E: **66/66 passed**.
- Vercel deployment: READY.
- Production deployment commit: `d0f7adf31930613d4fb1d32d17c5594e6795b556`.
- Production runtime error query: **no runtime errors in the selected 24-hour window**.
- Production error/fatal runtime-log query for the final deployment: **no matching logs**.

The E2E suite repeatedly emitted a non-failing warning for `device_installation_registration_failed` because server-side operational actions are not configured in that test environment. It is not silently classified as a passing operational feature; it remains a separate configuration item.

## 9. Production target

- Vercel project: `dental-marketplace-pwa`.
- Production deployment: `dpl_ERWbgET3qH1YHbXkV9ugPkct6DLg`.
- Production domains include `www.mmc-mms.com` and `mmc-mms.com`.
- Supabase project: `qatar-dental-dev` (`bqvcukxfsnchvkgejolz`).
- Supabase region: `eu-central-1`.

No production database migration or application behavior change is part of this handover cleanup.

## 10. Security boundary

Do not commit secrets, service-role keys, JWTs, cookies, PII, database dumps or provider credentials. Keep privileged Supabase clients server-only. Keep RLS, ownership checks, booking idempotency and atomic booking constraints intact.

The current Supabase security advisor reports one external warning: leaked-password protection is disabled. This is an environment/security setting and **was not changed by this repository-only handover**, because changing it is outside a file-only consolidation and requires an explicit Supabase configuration decision.

## 11. Final engineer workflow

1. Checkout `main`.
2. Read `AGENTS.md`.
3. Read this document.
4. Read `docs/ARCHITECTURE_AND_CODE_MAP_AR.md`.
5. Read `docs/SOURCE_MANIFEST.md`.
6. Run `npm ci`.
7. Run `npm run verify`.
8. Run `npm run test:e2e` only with a valid isolated public Supabase test environment.
9. For changes, create a short-lived topic branch from current `main`.
10. Open a PR; do not merge stale branches wholesale.
11. Let CI and Vercel Preview validate the exact PR head before production.
12. Merge only the reviewed PR into `main`.

This follows the standard GitHub branch/PR workflow and the recommended Develop → Preview → Ship pattern for Next.js/Vercel projects.

## 12. Acceptance statement

The repository is considered **handover-ready for a new software engineer** when:

- `main` is the only release source.
- Non-runtime cleanup is complete.
- No proven duplicate source module remains unaddressed.
- Protected runtime modules remain intact.
- Architecture/source maps identify the canonical implementation for each major domain.
- CI/build/E2E evidence is available.
- Rollback reference exists.
- Historical branches are explicitly classified rather than treated as current source.

**Do not reduce the file count further unless the same proof-based process is repeated.**
