# Dental Marketplace PWA — Deployment Runbook

## Current immutable references
- Local branch: `main`
- Base implementation commit: `ffc5053`
- Supabase DEV project ref: `bqvcukxfsnchvkgejolz`
- Supabase URL: `https://bqvcukxfsnchvkgejolz.supabase.co`
- Payments: disabled; `pay_at_clinic`

## 1. Create the empty GitHub repository
Create `Bomussa/dental-marketplace-pwa` as an **empty** repository. Do not initialize README, .gitignore, or license.

From this project directory:

```bash
git remote add origin https://github.com/Bomussa/dental-marketplace-pwa.git
git branch -M main
git push -u origin main
```

If `origin` already exists, inspect it first with `git remote -v`; do not overwrite an unrelated remote.

## 2. Configure GitHub Actions secrets
Repository → Settings → Secrets and variables → Actions → New repository secret:

- `NEXT_PUBLIC_SUPABASE_URL` = the DEV Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the DEV project's publishable `sb_publishable_...` key

Do **not** add a Supabase secret key or service-role key to client-side variables.

The workflow `.github/workflows/ci.yml` runs static checks, TypeScript, ESLint, Vitest, Next.js build, and then Playwright.

## 3. Import to Vercel
Import `Bomussa/dental-marketplace-pwa` into the existing Vercel team `bomussa` as a new project. Framework preset: Next.js. Keep the normal Next.js build settings.

Set these Vercel environment variables for Preview and Production as appropriate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — exact canonical Production URL, including `https://`

Do not configure `NEXT_PUBLIC_SUPABASE_ANON_KEY`; this codebase uses the current publishable-key variable.

## 4. Supabase Auth URL configuration
After the first Vercel production URL exists:

- Site URL: exact canonical Production URL.
- Redirect URL: exact production callback pattern, e.g. `https://your-domain.example/**`.
- Local development: `http://localhost:3000/**`.
- Vercel previews: use the account/team-scoped Vercel preview wildcard recommended by Supabase, not a global `https://*.vercel.app/**` allowlist.

The app sends Magic Link callbacks to `/auth/confirm` using `NEXT_PUBLIC_SITE_URL` when configured.

## 5. Dependency and verification loop
On a machine with working access to the official npm registry:

```bash
npm install
node scripts/predeploy-check.mjs
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

After the first successful install, commit the generated `package-lock.json` so future CI and Vercel builds can move to `npm ci` for deterministic dependency resolution.

A registry mirror may be used only as a temporary local recovery measure. Do not commit a third-party registry as the project's default registry.

## 6. Production acceptance
Do not mark Production launch complete until all are true:

- GitHub CI is green.
- Vercel production build succeeds.
- `/`, `/login`, search, booking, `/account`, clinic dashboard, and admin routes load without runtime errors.
- Magic Link returns to the Vercel/production domain and establishes a session.
- Anonymous search sees only publishable data.
- Clinic A cannot access Clinic B tenant data.
- Atomic booking still rejects a second active booking for the same slot.
- Payment feature flag remains disabled until its separate gate is approved.
