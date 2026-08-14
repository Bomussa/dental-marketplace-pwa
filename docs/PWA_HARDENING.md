# PWA Production Hardening

This document records the production-safe PWA hardening applied to the Qatar Dental marketplace.

## Implementation

- App icons are generated in code with Next.js `ImageResponse` to avoid binary asset drift or corruption.
- Next.js metadata exposes a 512×512 application icon and a 180×180 Apple touch icon.
- The Web App Manifest declares 192×192 and 512×512 PNG icons, each with separate `any` and `maskable` purposes.
- `/favicon.ico` and `/favicon.png` are internally rewritten to the generated 192×192 icon route.
- The dynamic PWA icon endpoint only accepts the supported sizes `192` and `512`; unsupported sizes return `404`.
- Existing security headers remain unchanged.

## Release discipline

PWA changes are built and type-checked in a Vercel Preview Deployment before promotion to the production branch. Production acceptance must verify the manifest, generated image endpoints, health endpoint, critical public routes, authentication guards, and production runtime logs.
