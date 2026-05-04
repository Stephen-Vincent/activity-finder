# Project Status

A plain-English snapshot of what's in this repo as of the first commit (May 2026).

If you've been away from this project for a while, read this file first. It'll get you back up to speed in five minutes. The full vision and strategy lives in [DESIGN.md](./DESIGN.md) — this file just covers what's actually been built so far.

---

## What this project is

Activity Finder is a mobile app that helps parents in Northern Ireland and the Republic of Ireland find things to do with their kids — local activities and day trips, for ages 0–17. Venues can claim their listing for free and pay a monthly fee for marketing perks. Parents can pay for an ad-free Premium tier with extra filters and partner discounts.

## Where we are right now

We are pre-launch. Nothing user-facing has been built yet. What's in this repo is **the foundation**: the design document, the folder structure, configuration, and a skeleton of the React Native app with all the right libraries installed. No actual screens or features work yet. The next phase is writing the database schema, then building the Discover screen.

Think of it like a construction site where the plot has been marked out, the architectural drawings exist, and the empty rooms have been framed — but no walls, plumbing, or furniture yet.

---

## What's been done

### 1. The design has been figured out

A full design document has been written: the vision, target audience, the quirks of operating across two countries (NI vs ROI — different currencies, postcodes, school terms, tax rules), the monetisation strategy (four revenue streams), the data model, the technical architecture, the roadmap, and the known risks.

See [DESIGN.md](./DESIGN.md). The "At a glance" section at the top is the quick read; the rest is the deep dive.

### 2. The repo has been set up as a monorepo

A monorepo is one git repository holding several related projects. We have one folder for the mobile app (`apps/mobile/`) and one for the database backend (`supabase/`). When the venue admin website is added later (Phase 3 of the roadmap), it'll be `apps/admin/` in the same repo. The reasoning — shared code and types between the apps without the pain of publishing private packages — is in [DECISIONS/0001-monorepo.md](./DECISIONS/0001-monorepo.md).

### 3. The mobile app has been scaffolded

Using Expo's project generator, we created a fresh React Native app under `apps/mobile/`. On top of that we added our own folder structure: screens, components, libraries, hooks, types. Every file in those folders currently contains just a header comment explaining what code will eventually live there. So the rooms exist, but the furniture doesn't yet.

All the libraries we'll need are installed:

- **Expo Router** — moves between screens
- **Supabase JS** — talks to the database and handles login
- **Mapbox** — draws the map
- **Stripe** — handles payments
- **TanStack Query** — caches data fetched from the database so the app feels fast
- **AsyncStorage** — stores small bits of data locally on the phone (like a remembered login)
- **Reanimated**, **Gesture Handler**, **Safe Area Context** — standard infrastructure for any modern mobile app
- A few Expo helpers: location permissions, push notifications, status bar, deep links, app config

### 4. The Supabase folder has been created

Supabase is the service that gives us our database, login, file storage, and a place to run small server-side scripts (called Edge Functions). Under `supabase/` are:

- `migrations/` — where the database structure will be defined as SQL files. Currently a stub with a detailed TODO comment listing every table that needs to be created.
- `functions/` — four small server-side jobs sketched out with header comments. None are written yet:
  - `stripe-webhook` — when a payment happens, update the user's status.
  - `create-subscription` — kick off a new Premium subscription without putting the secret Stripe key on the phone.
  - `booking-redirect` — when a parent taps "Book tickets", record the click for affiliate commission and forward them to the partner site.
  - `daily-digest` — runs each morning and sends "today's picks" push notifications.
- `seed/` — sample data. A handful of real venues (W5, Pickie Family Fun Park, Streamvale Open Farm, Imaginosity, Dublin Zoo) so local development isn't staring at an empty app. Plus placeholders for the category list and school-term calendars.
- `config.toml` — settings for running Supabase locally during development.

### 5. Documentation has been written

The `docs/` folder now contains:

- `DESIGN.md` — the full design document.
- `DATA_MODEL.md` — placeholder for the eventual SQL schema reference. Filled in once the schema is written.
- `SETUP.md` — how to set up your local development environment.
- `STATUS.md` — this file.
- `DECISIONS/` — short records explaining the *why* behind two key choices: monorepo vs separate repos, and Mapbox vs Google Maps.

### 6. Licensing decision made

Started as MIT (open source), switched to proprietary "all rights reserved" before the first commit. While pre-launch, the manually-compiled venue dataset is the moat, and we don't want a competitor cloning everything we publish. We can flip to a permissive licence later if it makes sense.

### 7. Configuration in place

Standard hygiene that pays off later:
- `.editorconfig` so any editor formats consistently.
- `.nvmrc` pinning Node version to 20.
- `.prettierrc` for consistent code formatting.
- `.gitignore` covering Node, Expo, Supabase, native build outputs — and importantly the file that would otherwise leak the Mapbox secret token if someone runs a native build.
- `.env.example` listing every secret the app and scripts will need, with comments distinguishing what's safe to expose to the phone vs what must stay server-side.

---

## How the folders fit together

```
activity-finder/
├─ docs/                ← All the writing — design, decisions, this file
├─ apps/
│  └─ mobile/           ← The React Native app
│     ├─ app/           ← Each file = one screen (Home, Discover, etc.)
│     ├─ components/    ← Reusable UI pieces (VenueCard, MapView, etc.)
│     ├─ lib/           ← Wrappers around Supabase, Stripe, Mapbox, etc.
│     ├─ hooks/         ← Reusable bits of behaviour (useVenues, useChildren)
│     └─ types/         ← TypeScript type definitions
├─ supabase/
│  ├─ migrations/       ← Database structure, as SQL
│  ├─ functions/        ← Server-side jobs (Stripe webhook, daily digest, etc.)
│  └─ seed/             ← Sample data for local development
├─ scripts/             ← One-off tasks (seeding venues, updating school terms)
├─ package.json         ← Root config, declares the monorepo
├─ README.md            ← Quick project intro
└─ LICENSE              ← Proprietary, all rights reserved (for now)
```

---

## What's not yet done

To go from "scaffold" to "the app actually does something," the major work ahead is:

1. **Write the SQL schema.** Fills in `supabase/migrations/0001_init.sql`. This is the single biggest unblocker — once tables exist, everything else can talk to them.
2. **Generate TypeScript types** from that schema, so the app gets autocomplete and type-checking against the real database shape.
3. **Build the auth flow** — sign-in screen, onboarding, children profiles.
4. **Build the Discover screen** — map plus list plus filters. The hardest single piece, and the heart of the app.
5. **Compile the initial venue dataset.** Manual data work that nothing else can replace. Target: 500+ venues across NI and ROI before launch.
6. **Visual design** — app icon, splash screen, colour palette, typography. Until this is done the app will look like every other unfinished Expo project.

After that, alpha test, beta test, ship.

---

## How to pick this back up

If you've been away from the project for a while:

1. Read this file (you're doing it).
2. Read the "At a glance" section of [DESIGN.md](./DESIGN.md) to remember how the pieces fit together.
3. From the repo root, run `npm install` to restore dependencies.
4. Run `npm run mobile` to start the Expo dev server. Scan the QR code with the Expo Go app on your phone, or press `i` for the iOS simulator.
5. The next file to actually edit is `supabase/migrations/0001_init.sql` — that's the first piece of real, non-scaffolding work.

If a question comes up that this file doesn't answer, [DESIGN.md](./DESIGN.md) probably has it. If neither does, add the question to the open-questions list in DESIGN.md §12 and decide later.
