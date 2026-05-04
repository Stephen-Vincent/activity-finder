# Activity Finder

Find things to do with the kids — across Northern Ireland and the Republic of Ireland.

## What it is

Activity Finder is a mobile app that helps parents discover local activities and day trips for kids aged 0–17. Filter by age, distance, weather, budget, accessibility, and school-holiday timing. Venues and businesses can claim their listing and upgrade to a Pro tier for marketing reach.

## Status

Pre-launch. Currently building the MVP.

## Tech stack

- **Mobile:** React Native (Expo, Expo Router)
- **Backend:** Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions)
- **Payments:** Stripe Billing
- **Maps:** Mapbox
- **Push / Analytics / Errors:** Expo Notifications, PostHog (EU), Sentry

## Repo layout

```
activity-finder/
├─ apps/
│  └─ mobile/         # Expo React Native app
├─ supabase/
│  ├─ migrations/     # Versioned SQL
│  ├─ functions/      # Edge Functions (Deno)
│  └─ seed/           # Reference + sample data
├─ docs/              # Design doc, ADRs, setup guide
└─ scripts/           # One-off scripts (data seeding, etc.)
```

## Getting started

See [docs/SETUP.md](./docs/SETUP.md).

## Documentation

- [Design doc](./docs/DESIGN.md) — vision, scope, monetisation, architecture
- [Data model](./docs/DATA_MODEL.md) — schema reference
- [Setup](./docs/SETUP.md) — local dev environment
- [Decisions](./docs/DECISIONS/) — architecture decision records

## License

See [LICENSE](./LICENSE).
