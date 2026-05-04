# Development setup

## Prerequisites

- Node.js 20+ (use `nvm use` — the repo has a `.nvmrc`)
- npm 10+
- Watchman (macOS): `brew install watchman`
- Xcode + iOS simulator (for iOS builds)
- Android Studio + an emulator or device (for Android builds)
- Docker Desktop (required by `supabase start`)
- Supabase CLI is installed as a dev dependency by `npm install` (step 1 below) — no global install needed.
- Optional: `tsx` for running TypeScript scripts (`npm i -g tsx`)

## 1. Clone and install

```bash
git clone https://github.com/<your-org>/activity-finder.git
cd activity-finder
nvm use
npm install
```

This installs dependencies for all workspaces (currently just `apps/mobile`).

## 2. Configure environment

```bash
cp .env.example .env
# Fill in the Supabase, Mapbox, Stripe, etc. values.
```

Then create a per-workspace env file the mobile app can read at build time:

```bash
cp .env apps/mobile/.env
```

Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the client bundle. Anything secret (service-role keys, Stripe secrets) must stay server-side.

## 3. Bring up Supabase locally

```bash
npm run supabase:start
```

This boots Postgres, Auth, Storage, Studio, and Edge Functions runtime in Docker. Studio is available at <http://localhost:54323>. The local Postgres URL is in `.env` as `SUPABASE_DB_URL`.

To apply migrations and seed:

```bash
npm run supabase:reset    # destructive: drops local DB, reapplies migrations + seeds
```

## 4. Generate database types

After any schema change:

```bash
supabase gen types typescript --local > apps/mobile/types/database.ts
```

## 5. Run the mobile app

```bash
npm run mobile        # starts Metro
npm run mobile:ios    # builds + opens iOS simulator
npm run mobile:android
```

Expo Go works for JS-only changes; once native modules are added (Mapbox, Stripe), use a development build via EAS or `expo run:ios` / `expo run:android`.

## 6. Edge functions locally

```bash
npm run supabase:functions:serve
```

Set required env vars (Stripe keys, etc.) before invoking.

## 7. Common tasks

```bash
npm run mobile:lint          # ESLint
npm run mobile:typecheck     # tsc --noEmit
npm run format               # Prettier across the repo
npm run supabase:migrate     # apply local migrations to a remote project
```

## Troubleshooting

**Metro port 8081 in use** — `npm run mobile -- --clear`.

**Mapbox build error** — verify `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is exported in your shell when you run `expo prebuild` / `expo run:*`. The `@rnmapbox/maps` Expo plugin reads it directly from the environment; it is not configured in `app.json`.

**Supabase types are empty** — make sure local Supabase is running (`npm run supabase:start`) before generating types.

**iOS build fails on Pod install** — `cd apps/mobile/ios && pod install` once we eject; not needed in managed workflow.
