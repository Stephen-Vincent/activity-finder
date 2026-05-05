# 2026-05-05 — Onboarding: capture profile + children

**Duration:** ~1.5 hours
**Where I started:** Auth flow shipped (commit `e163320`). The signed-in user lands on a placeholder home screen with no profile data and no children.
**Where I ended:** Working onboarding flow — country, postcode (geocoded via Mapbox), display name, marketing opt-in, optional children with date of birth — tested end to end on a real iPhone with a real NI postcode. Home tab now greets the user by name and shows their postcode. Typecheck stays green throughout.

## Goal

Build the onboarding flow that runs on first sign-in:

1. Welcome screen.
2. Country picker (Northern Ireland / Republic of Ireland).
3. Postcode / Eircode entry, validated via Mapbox geocoding.
4. What should we call you? (display_name).
5. Marketing opt-in (single checkbox).
6. Add children — one or more, nickname + DOB.
7. Done — bounce to (tabs)/home.

Plus the plumbing around it:

- Extend `AuthProvider` to load the `public.users` row (the "profile") alongside the auth session.
- Extend `AuthGate` to route signed-in users with `home_postcode IS NULL` to `/onboarding` instead of `/(tabs)/home`.
- Implement `lib/mapbox.ts` (forward geocoding) and `hooks/useChildren.ts`.

Permissions prompts (location, notifications) are deliberately deferred — request when each feature actually needs them, not in a wall of prompts up front.

## What got done

**Domain types.** [`apps/mobile/types/domain.ts`](../../apps/mobile/types/domain.ts) now has real `Profile` and `Child` types with row-to-domain mappers (`profileFromRow`, `childFromRow`). `Child` carries a computed `ageYears` that respects whether the birthday has passed yet this year — there's a small `computeAgeYears` helper for that. The DB-side `country_code` and `currency` enums are narrowed to our app-side `'GB-NIR' | 'IE'` and `'GBP' | 'EUR'` unions at the boundary.

**Mapbox forward geocoder.** [`apps/mobile/lib/mapbox.ts`](../../apps/mobile/lib/mapbox.ts) exposes a single `geocode(query, country)` function. It biases by country (NI maps to Mapbox's `'GB'`, ROI to `'IE'`) so an NI postcode entered with the wrong country picked won't accidentally match an English town with the same code. Throws a typed `MapboxNotConfiguredError` if the env var is missing or still the placeholder, so the onboarding screen can show a useful message instead of a generic "fetch failed".

**`useChildren` hook.** [`apps/mobile/hooks/useChildren.ts`](../../apps/mobile/hooks/useChildren.ts) — `{ children, loading, error, addChild, removeChild, refresh }`. Plain `useState` + `useEffect` for now; we'll migrate to TanStack Query when QueryProvider is implemented. RLS handles owner-scoping at the database layer so we don't filter by `user_id` client-side.

**AuthProvider learned about profiles.** [`apps/mobile/components/providers/AuthProvider.tsx`](../../apps/mobile/components/providers/AuthProvider.tsx) now also fetches the matching `public.users` row whenever a session appears, exposing `{ profile, profileLoading, refreshProfile }` alongside the existing `{ session, user, loading, signOut }`. `refreshProfile` is what onboarding calls when it's done so AuthGate can re-evaluate.

**AuthGate became onboarding-aware.** The gate logic in [`apps/mobile/app/_layout.tsx`](../../apps/mobile/app/_layout.tsx) now considers three groups instead of two: signed-out users belong in `auth/`, signed-in users with no postcode belong on `/onboarding`, and signed-in users with a postcode belong in `(tabs)/`. While the profile is still loading, it does nothing — that's how we avoid the "flash of wrong screen" between session-arrived and profile-loaded.

**The onboarding screen.** [`apps/mobile/app/onboarding.tsx`](../../apps/mobile/app/onboarding.tsx) is a single-screen state machine with eight states: welcome, country, postcode, display name, marketing, children list, children add, done. The profile UPDATE happens once at the end of the marketing step (one network call for all four fields). Children are INSERTed individually as added, so partial progress survives an app close. Date-of-birth uses three numeric inputs — DD / MM / YYYY — rather than a native picker, because we don't have one installed yet and the inputs are clearer than a single mashed text field.

**Home tab now uses the profile.** Greets the user by name when known and shows the home postcode under the email. Still has the temporary sign-out button — moves to Profile when that screen is built.

**Smooth pass on the device.** Loaded the app on the iPhone, AuthGate bounced an existing user (no postcode yet) to onboarding, walked the full flow with `BT23 6FN`, the geocoder confirmed a real Northern Irish address, profile saved, AuthGate bounced to home, the greeting and postcode showed up. No surprises. Typecheck still passes. Total: built and tested in one go, no debugging detours.

## Decisions made

- **Capture display_name + marketing opt-in during onboarding, not later.** The user said "full set". Marketing opt-in needs to be at sign-up time anyway for compliance, so doing it now closes that loop.
- **Mapbox forward geocoding for postcode validation.** Cheaper than building two regex paths (one for UK postcodes, one for Eircodes), gives us a "Belfast BT1 1AA — Belfast, Northern Ireland" confirmation message back to the user, and the free tier (100k/month) is well within our scale.
- **Defer permissions prompts** to when they're actually needed (location → on opening Discover, notifications → first notification-driven feature). Less spammy, gives the user context for *why* we're asking.
- **Profile lives on `useAuth`**, not a separate hook. `useAuth` already exposes `{ session, user }`; adding `{ profile, refreshProfile }` keeps the "is this the right person and what do we know about them" question in one place.
- **Onboarding gating signal: `profile.home_postcode IS NULL`.** Simplest binary check. We don't have an `onboarding_completed_at` column and don't need one yet.

## What's deferred / open

- **No native date picker for DOB.** Three numeric inputs work fine, but a real date picker (`@react-native-community/datetimepicker`, installed via `expo install`) would be nicer. Swap when we touch onboarding again, or when adding child editing in Profile.
- **Profile fetch error handling is shallow.** If the `users` row read fails (RLS, network), the provider logs a console warning and leaves `profile` null. AuthGate then waits forever. Acceptable for v0 because the `handle_new_user` trigger should always create a row, but worth a retry-with-backoff or a real error UI before TestFlight.
- **No way to edit the profile after onboarding** — that lives on the Profile tab once we build it. Today the user is stuck with whatever they typed.
- **Permissions prompts** still deferred to feature trigger points (location → Discover, notifications → first notify-driven feature).
- **Apple Sign In + Google + account deletion + toast UI** — same as the auth session.
- **Mapbox token in `.env` is local-only.** The committed `.env.example` still shows the placeholder; new contributors will need their own token before onboarding works for them.

## Where to pick up

The signed-in experience now has real data flowing into it. The next set of choices is roughly:

1. **Build the Discover tab + Mapbox map.** This is the most visible feature of the app and re-uses the geocoded postcode for "near me". Means installing `@rnmapbox/maps` properly (we removed it from `app.json`'s plugins earlier) and standing up a development build, since Mapbox's native SDK doesn't run in Expo Go.
2. **Build the Profile tab.** Show the user their stored profile, list their children, expose edit forms, move the sign-out button off Home. Smaller scope, no new native deps.
3. **Seed the `venues` table** so Discover has something to show. Either via the `scripts/seed-venues.ts` stub or a hand-written SQL seed.

I'd lean **Profile tab next** — it gives us a clean home for sign-out, lets us delete our test data via the UI, and exercises the typed Supabase write path again without the friction of a development build. Mapbox-on-device is a session that deserves its own attention.

## Commits / PRs

- `62c8d1f` — `feat(onboarding): country, postcode, name, marketing, children`. Pushed cleanly to `origin/main`. Also rolled in the close-out edits to [`docs/sessions/2026-05-05-auth.md`](./2026-05-05-auth.md) that didn't make it into commit `e163320`.
