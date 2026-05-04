# 2026-05-04 — Foundation: design, scaffold, first commit

**Duration:** ~3 hours (one sitting)
**Where I started:** Empty repo with a few stale files (README pointing at non-existent docs, MIT licence, Google Maps in the .env example).
**Where I ended:** Monorepo scaffold pushed to GitHub. Design doc written. Expo app generated with all dependencies installed. No app features yet.

## Goal

Decide what Activity Finder actually is, lay down a clean repo structure, and get to a first commit on `main`.

## What got done

**The product is now defined on paper.** A full design document lives at [DESIGN.md](../DESIGN.md). It covers the vision, the audience (families with kids 0–17), the launch markets (Northern Ireland and the Republic of Ireland — treated as a single product surface despite the cross-border quirks), four monetisation streams (Venue Pro subscription, Parent Premium subscription, booking commission, promoted listings), the data model, the technical architecture, a 12-month roadmap, and the known risks. The "At a glance" section at the top is a plain-English explainer of the whole stack and how the pieces talk to each other.

**The repo is now a monorepo** with `apps/mobile/` for the React Native app and `supabase/` for the database backend. Future venue admin website will live at `apps/admin/`. ADR explaining the choice: [DECISIONS/0001-monorepo.md](../DECISIONS/0001-monorepo.md).

**The mobile app has been scaffolded** with `create-expo-app` (blank-typescript template, Expo SDK 54). Our own folder structure — `app/` (screens), `components/`, `lib/`, `hooks/`, `types/` — was added on top, and every file in those folders contains a header comment describing what code will eventually live there. No actual UI exists yet. All the libraries we need are installed: Expo Router, Supabase JS, Mapbox (`@rnmapbox/maps`), Stripe (`@stripe/stripe-react-native`), TanStack Query, AsyncStorage, Reanimated, Gesture Handler, plus the Expo helpers for location, notifications, and deep linking.

**The Supabase folder** has placeholders for migrations, four Edge Functions (`stripe-webhook`, `create-subscription`, `booking-redirect`, `daily-digest`), seed SQL for categories and school terms, and a sample CSV of five real venues (W5, Pickie, Streamvale, Imaginosity, Dublin Zoo) to make local dev non-empty. The actual schema (`migrations/0001_init.sql`) is a stub with a detailed TODO comment.

**Documentation written:** DESIGN, DATA_MODEL (placeholder), SETUP, two ADRs, and this session log.

**A handful of small fixes during setup:**
- The `npx create-expo-app` step exploded the first time because our placeholder `package.json` had `"//note"` keys inside `dependencies` — npm only tolerates `//` comment keys at the top level. Fixed by wiping and reinstalling.
- The `RNMapboxMapsDownloadToken` plugin option was deprecated; switched to the `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` env var convention.
- Hardened `.gitignore` to cover `android/gradle.properties` so the Mapbox secret can't leak via a future `expo prebuild`.

**First commit pushed to GitHub.** Branch: `main`. Commit message: `chore: scaffold monorepo — design doc, Expo skeleton, Supabase folder`.

## Decisions made

- **Monorepo** over separate repos. Rationale in [ADR 0001](../DECISIONS/0001-monorepo.md).
- **Mapbox** over Google Maps for the map SDK and geocoding. Rationale in [ADR 0002](../DECISIONS/0002-mapbox-over-google.md).
- **Proprietary licence** instead of MIT, while pre-launch. The manually-compiled venue dataset is the moat; we don't want it cloned. Can flip to permissive later.
- **Freemium claim, paid Pro** for venues. Anyone can claim a basic listing for free; Pro unlocks the marketing surface. This is what makes the cold-start solvable.
- **Expo managed workflow** rather than bare RN. One codebase, both stores, OTA updates without re-submitting JS-only changes for App Store review.

## What's deferred / open

- **Eircode licensing** for ROI postcodes. Mapbox geocoding probably handles formatted addresses, but Eircode-specific lookup is licensed. Resolve before any address-handling code lands.
- **App name** is still working title. Trademark and App Store availability check needed.
- **Initial venue dataset.** The biggest "must do before launch" item. Aim for 500+ venues across NI + ROI before the public launch.
- **Visual design.** Icon, splash, palette, type. Not started.
- The other open questions in [DESIGN.md §12](../DESIGN.md#12-risks--open-questions).

## Where to pick up

**Write the SQL schema** — `supabase/migrations/0001_init.sql`. The file currently has a TODO comment listing every table that needs to exist. Until the schema is in place, the app can't talk to the database, types can't be generated, and nothing else can move.

After the schema, the natural sequence is: generate TypeScript types (`supabase gen types typescript --local > apps/mobile/types/database.ts`), wire up the Supabase client in `apps/mobile/lib/supabase.ts`, then build sign-in.

## Commits / PRs

- Initial commit on `main`: `chore: scaffold monorepo — design doc, Expo skeleton, Supabase folder`.
