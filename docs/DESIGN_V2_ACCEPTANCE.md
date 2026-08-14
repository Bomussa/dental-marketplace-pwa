# Design V2 final acceptance

This branch is a clean acceptance target for the complete premium design tree.

Required before promotion:

- Vercel build READY
- Next.js compile and TypeScript pass
- `/api/health` database check
- exact-variant search and price ordering check
- unauthenticated guards for account, clinic and admin
- PWA manifest/icon/service worker checks
- no 5xx or runtime errors after acceptance traffic
