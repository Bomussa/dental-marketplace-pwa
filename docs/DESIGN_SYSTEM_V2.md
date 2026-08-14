# Design System V2 — Asnani Qatar

## Product direction

The UI combines three proven product patterns without copying third-party branding:

- Apple-style visual hierarchy and functional glass treatment for navigation/control layers.
- Marketplace-style segmented search that keeps the primary decision inputs in one place.
- Healthcare-booking result cards that prioritize trust, price, distance, availability, and the booking action.

## Semantic color system

- Primary action: `#007AFF`
- Primary hover/emphasis: `#0066CC`
- Success / active / available: `#34C759`
- Warning / pending: `#FF9F0A`
- Destructive / error: `#FF3B30`
- Supporting accent: `#5856D6`
- Main text: `#101828`
- Secondary text: `#667085`
- App background: `#F5F7FB`

Color is never the only status indicator; text labels remain visible.

## Components

- Floating glass navigation shell
- Segmented treatment / exact variant / appointment search dock
- Pill CTAs with 48px minimum action height
- Rounded 20–30px cards with restrained elevation
- Consistent outline icon family
- Semantic status badges
- Responsive dashboard cards for patient, clinic, and platform admin surfaces

## Accessibility

- Visible `:focus-visible` ring
- Reduced-motion fallback
- Text status labels in addition to color
- RTL-first layout and Arabic copy
- Large tap targets for primary actions

## Data and product integrity

The design does not change booking, RLS, verification, search ranking, price snapshot, payment gating, or authentication logic. Visual hierarchy exposes those guarantees more clearly without weakening them.
