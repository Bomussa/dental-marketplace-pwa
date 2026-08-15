# Security dependency exceptions

Last reviewed: 2026-08-15

This file records dependency findings that are visible in `npm audit` but cannot be removed today without moving the core application from the current stable Next.js line to a Preview release. It is not a waiver for new Critical findings.

## Current stable framework pin

- `next`: `16.2.12`
- `eslint-config-next`: `16.2.12`
- `react` / `react-dom`: `19.2.8`

At this review point, the official npm `latest` tag for Next.js is 16.2.12 and the 16.3 line is still Preview. The project therefore does not use `npm audit fix --force` when that command proposes 16.3.x.

## Known High findings inherited by Next.js 16.2.12

`npm audit --omit=dev --audit-level=high` currently reports:

- PostCSS advisories through Next.js' nested PostCSS dependency, including source-map / stringify issues.
- Sharp/libvips advisories through Next.js' image dependency.

The repository does not currently import `next/image`, and no application feature intentionally accepts or processes user-controlled CSS/source maps. These facts reduce the application-specific exposure but do not erase the upstream findings.

## Policy

1. Critical runtime dependency findings remain a blocking CI failure.
2. High findings remain visible in CI output and this exception must be reviewed whenever Next.js publishes a new Stable release.
3. Do not move production to a Preview/Canary release solely to make `npm audit` green.
4. Do not use `npm audit fix --force` without reviewing the resulting framework version and running the complete CI/Preview/Production acceptance chain.
5. Remove this exception as soon as a stable, compatible dependency set clears the findings.

The repository issue titled `Security dependency watch — stable Next.js upstream advisories` tracks this exception. Close it only after a stable update clears the relevant audit findings and the locked-head CI, Preview, and Production smoke chain passes.
