# أسناني قطر — Repository Census — 2026-09-10

This document records the machine-measured repository census from the `main` build at commit `c709fd5caf2448539628e4969675bc30cda47f45`.

## Exact repository counts

| Metric | Exact count |
|---|---:|
| Git-tracked project files | **392** |
| TypeScript / JavaScript source files | **163** |
| Lines in TS/JS-family sources | **15,033** |
| JS/TS callable implementations | **1,066** |
| SQL functions | **178** |
| SQL procedures | **0** |
| Executable routine implementations including SQL | **1,244** |
| TypeScript/JavaScript parser errors | **0** |

The 1,244 figure is the exact count of executable routine implementations detected by the repository metrics checker. It is used as the reproducible code-level proxy for algorithmic/executable units; it is **not** a subjective claim that every routine is a separate business algorithm.

## JS/TS callable breakdown

| Kind | Count |
|---|---:|
| Function declarations | **387** |
| Arrow functions | **670** |
| Function expressions | **0** |
| Class methods | **6** |
| Getters | **0** |
| Setters | **0** |
| Constructors | **3** |
| **Total** | **1,066** |

## Files by extension

| Extension | Count |
|---|---:|
| `.css` | 1 |
| `.example` | 1 |
| `.html` | 1 |
| `.js` | 5 |
| `.json` | 8 |
| `.md` | 85 |
| `.mjs` | 8 |
| `.mts` | 1 |
| `.py` | 2 |
| `.sql` | 86 |
| `.ts` | 104 |
| `.tsx` | 46 |
| `.webp` | 42 |
| `.yml` | 1 |
| no extension | 1 |
| **Total** | **392** |

## Verification method

The counts are produced by `scripts/repo-metrics.mjs` during the actual Vercel build. The script uses `git ls-files` for the authoritative tracked-file set, TypeScript's parser for TS/TSX/JS/JSX/MJS/CJS callable implementations, and SQL routine declarations for database functions/procedures. The build reported `parseErrors: []`.

This is intentionally preferable to a manually estimated file count or a GitHub search result: it measures the checked-out repository itself and is rerunnable after every future change.

## Current branch policy

`main` is the authoritative application source. Historical, rollback, preview, audit, and feature branches are Git refs, not additional project folders inside `main`. They must not be blindly merged into `main`: doing so would reintroduce historical or experimental changes and could break the current production contract. Branch cleanup should therefore be performed only after each branch is classified as merged/obsolete and the branch deletion capability is available.

## Verified consolidation already present in main

- Duplicate CSV cell escaping: **2 implementations → 1 shared implementation** in `lib/csv.ts`.
- Duplicate no-store API response helper: **5 implementations → 1 shared implementation** in `lib/api-response.ts`.
- Search route repeated no-store response construction was migrated to the same shared helper.
- No runtime API route was deleted.
- No authentication, authorization, RLS, database table, booking rule, pricing rule, availability rule, or concurrency contract was intentionally removed by the consolidation work.

## Build evidence

The `main` deployment for this census is Vercel deployment `dpl_4ytJJQxqwPEgwgUzvrM3AGrPjF6J` from commit `c709fd5caf2448539628e4969675bc30cda47f45`. The build executes repository metrics before predeploy checks, typecheck, lint, tests, and production build.

GitHub CI also runs `repo:metrics` as the first step of `npm run verify`, so future verification can detect changes in the repository census automatically.
