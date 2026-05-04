# Activity Finder — Design Document

**Working title:** Activity Finder
**Author:** Stephen Vincent
**Last updated:** 4 May 2026
**Status:** v0.1 draft — pre-first-commit

---

## At a glance — how the whole thing works

If you read nothing else, read this.

Activity Finder is a **mobile app** (iPhone + Android) that talks to a **single online database** with a few small **server-side jobs** running alongside it. That's the whole system.

### The pieces, in plain English

**The phone app — React Native + Expo.** This is what parents see and tap. We write the app once, and Expo turns it into both an iPhone app and an Android app. Expo also handles the fiddly bits: push notifications, asking for location permission, talking to the map SDK, and building the actual installable files for the App Store and Play Store.

**The database and backend — Supabase.** Supabase is a hosted service that gives us four things in one place:
- a Postgres database (the source of truth for everything: users, kids, venues, reviews, favourites, subscriptions),
- login (email magic link, Sign in with Apple, Sign in with Google),
- file storage (venue photos, review photos),
- a place to run small server functions (called Edge Functions).

The phone app talks **directly** to the database. There's no middle "API server" we have to build and maintain. Supabase enforces who-can-see-what at the database level using a feature called Row Level Security — so the rule "a parent can only read their own kids' profiles" lives in the database itself, not in app code that could be bypassed.

**The map — Mapbox.** Draws the map on the Discover screen, and turns a postcode (NI) or Eircode (ROI) into coordinates so we can search nearby.

**Payments — Stripe.** Handles all money: Parent Premium subscriptions (£/€2.99/month), Venue Pro subscriptions (£/€19/month), and later one-off booking payments. Stripe also tells us when a payment succeeds, fails, or a subscription is cancelled.

**Background jobs — Supabase Edge Functions.** Four tiny TypeScript programs that run on Supabase's servers, not on the phone:
- `stripe-webhook` — Stripe pings this whenever a payment happens, and it updates who's a paying member.
- `create-subscription` — when a parent taps "Go Premium", the app calls this so the secret Stripe key never has to live on the phone.
- `booking-redirect` — when a parent taps "Book tickets" on a venue, this records the click (so we can earn affiliate commission) and forwards them to the partner site.
- `daily-digest` — runs every morning at 7am and sends "today's picks" push notifications to parents who opted in.

**The supporting cast.** Push notifications via Expo, analytics via PostHog (EU-region for GDPR), error tracking via Sentry, transactional emails via Resend.

### A typical journey, end to end

1. **Parent opens the app.** App asks Supabase Auth "is this person logged in?" Yes → continue. No → show sign-in screen.
2. **Home screen loads.** App asks Supabase: "what venues are within 20km of my home, suit my 4-year-old and 8-year-old, are open right now, and match today's weather?" Supabase runs the query (using PostGIS for the geographic part) and sends back a list. Mapbox draws the map.
3. **Parent taps a venue.** App fetches the full venue details, photos, and upcoming events from Supabase.
4. **Parent taps "Save".** App writes a row into the `favourites` table.
5. **Parent decides to subscribe to Premium.** App calls the `create-subscription` Edge Function. That function talks to Stripe and sets up the subscription. The phone confirms payment using Stripe's mobile SDK. Stripe later pings our `stripe-webhook` function, which marks the user as Premium in the database. The next time the app loads, ads disappear and advanced filters unlock.
6. **Next morning at 7am**, the `daily-digest` function runs, looks at every parent who opted in, builds them a personalised "here's three places for today" list, and sends it as a push notification.

### Diagram

```
                  ┌──────────────────────────────────┐
                  │   Phone app: React Native + Expo │
                  │   (iOS + Android, one codebase)  │
                  └──────────────────────────────────┘
                       │              │              │
              ┌────────┘              │              └────────┐
              ▼                       ▼                       ▼
        ┌──────────┐           ┌─────────────┐         ┌──────────┐
        │  Mapbox  │           │   Stripe    │         │ Supabase │
        │  (maps + │           │ (payments,  │         │          │
        │  search) │           │  subs)      │         │          │
        └──────────┘           └─────────────┘         └─────┬────┘
                                      ▲                     │
                                      │                     │
                                      │             ┌───────┴────────┐
                                      │             │                │
                                      │       ┌─────▼────┐    ┌──────▼──────┐
                                      │       │ Postgres │    │ Auth + File │
                                      │       │   (DB)   │    │   Storage   │
                                      │       └──────────┘    └─────────────┘
                                      │             │
                                      │       ┌─────▼─────────────┐
                                      └───────┤  Edge Functions   │
                                              │  • stripe-webhook │
                                              │  • create-sub     │
                                              │  • booking-redir  │
                                              │  • daily-digest   │
                                              └───────────────────┘
```

### Why this stack, briefly

- **Expo** — ship to both stores from one codebase, push JS-only updates without re-submitting to Apple.
- **Supabase** — gives us a real Postgres database (which we need for the relational shape of venues × categories × events × reviews), plus login and storage, without us running any servers.
- **Mapbox** — best React Native map SDK in 2026, cheaper than Google at scale, EU-friendly.
- **Stripe** — handles GBP and EUR cleanly, copes with NI/ROI tax differences, has a subscription billing system we don't have to build.

The whole architecture is deliberately boring. We can build, ship, and maintain it as a one-person team for a long time before we need to add complexity.

---

## 1. Vision

Activity Finder helps parents in Northern Ireland and the Republic of Ireland discover what to do with their kids today, this weekend, or on a planned day trip — filtered by age, weather, budget, distance, and accessibility. Venues and businesses get a low-friction way to reach the right families; parents get a trusted, ad-light app that respects their time.

The core insight is that "what to do with the kids" is a high-frequency, low-tolerance-for-friction problem. Parents search Google, scroll Facebook groups, and ask WhatsApp chats. We replace that scattered workflow with one app that knows their kids' ages, where they are, and what's open.

### One-line pitch
> Tinder-fast discovery of family activities across Ireland and Northern Ireland — local today, day trips this weekend.

### Success looks like (12 months in)
- 1,500+ verified venues across NI + ROI.
- 10,000 monthly active parent users.
- 200 paying Pro venues at €/£15–35/month.
- 5% Parent Premium conversion of MAU.
- Affiliate/booking GMV ≥ €50k/month.

---

## 2. Audience & Personas

### Parents (primary)
- Aged 25–50, kids 0–17.
- Mobile-first. Mostly iOS in NI/ROI (~55–60% market share) but Android cannot be neglected.
- Pain points: weather-dependent planning, conflicting age suitability, hidden costs, school-holiday boredom, "I always go to the same five places."

### Venue / business owners (secondary)
- Independent operators: soft plays, farm parks, museums, escape rooms, climbing centres, pottery painting, kids' classes, holiday camps.
- Tourism operators: zoos, castles, heritage sites, country parks.
- Often non-technical. Need a portal that is faster than updating their Facebook page.

### Teens (tertiary, late roadmap)
- 13–17. Long-term we may give teens their own light-touch profile so parents can shortlist activities together. Not in MVP.

---

## 3. Cross-border considerations (NI + ROI)

This is the single most important constraint that shapes the design. We treat NI and ROI as one product surface but acknowledge real differences.

| Concern | Northern Ireland | Republic of Ireland |
|---|---|---|
| Currency | GBP (£) | EUR (€) |
| Postcode | UK postcode (BT…) | Eircode (e.g. D02 XY45) |
| Tax | UK VAT 20% | ROI VAT 23% standard, 13.5% reduced |
| Privacy | UK GDPR + DPA 2018 | EU GDPR |
| Public holidays | UK bank holidays | ROI bank holidays |
| School terms | NI EA calendar | DES calendar (different mid-terms) |
| Tourism body | Tourism NI | Fáilte Ireland |
| Emergency / safeguarding | PSNI / Social Services NI | Garda / Tusla |

Implications:
- Multi-currency from day one. Stripe handles both. Display currency follows the **venue's** location, not the user's.
- Two postcode systems. Use a single `postcode` text field plus a `country_code` enum (`GB-NIR`, `IE`). Never assume format.
- Distance display in km by default in ROI, miles in NI — user-overridable.
- Two GDPR regimes. In practice, treat the stricter (EU GDPR) as baseline; comply with both.
- School-holiday awareness is a feature, not a polish item. A "what's on this half-term" filter is a major differentiator and the calendars differ between NI and ROI.

---

## 4. Feature scope

We scope by phase. The MVP exists to validate that parents return weekly and that venues will pay to be listed. Everything beyond MVP is contingent on those two signals.

### Phase 0 — Pre-launch seed (no app yet)
- Manually compile a venue dataset of ~500 venues across NI + ROI (CSV).
- Photos, hours, age range, indoor/outdoor, price band, lat/lng, source.
- This dataset is the moat at launch. Without it the app is empty.

### Phase 1 — MVP (parent app, read-only venue data)
- Auth (email + Apple + Google).
- Onboarding: postcode/Eircode, list of children with DOBs (age inferred + auto-updated).
- Map + list discovery with filters: age, distance, category, indoor/outdoor, price band, open now, accessibility.
- Venue detail: photos, description, hours, price, age suitability, parking, accessibility, "directions" (deeplink to native maps).
- Favourites.
- Search.
- Weather-aware home screen ("Rainy in Belfast — here are 12 indoor picks within 10 miles").
- Basic profile.
- No reviews yet (avoids cold-start moderation pain).
- No payments.

### Phase 2 — Trust & engagement
- Reviews + ratings (verified-visit attempt via geofencing).
- Photos in reviews.
- Report listing / suggest edit.
- Save to "Plans" (a basket of activities for a planned day).
- Push notifications: "It's the school holidays — here's a fresh list."
- Share a venue / share a plan.

### Phase 3 — Venue self-service + Pro tier (first revenue)
- Venue claim flow ("Is this your business?").
- Venue dashboard: edit details, upload photos, set seasonal hours, post events.
- **Venue Pro subscription** (Stripe): featured placement, analytics, multi-photo galleries, event posting, response-to-reviews, booking link.
- Stripe billing portal.

### Phase 4 — Parent Premium + bookings
- **Parent Premium** subscription: ad-free, unlimited favourites & plans, advanced filters (sensory-friendly, breastfeeding-friendly, SEN-aware, "drop-off classes only"), school-holiday planner, exclusive partner deals.
- **Affiliate/booking** layer: deep-link to venue booking systems with tracked links; commission via partner programmes (Tiqets, GetYourGuide, Klook for ROI tourism). Where venues use Bókun, Roller, Checkfront — integrate webhooks.

### Phase 5 — Promoted listings + scale
- Self-serve promoted slots for non-Pro venues (pay-per-click or pay-per-day, geo-bounded).
- Editorial: "best of" lists curated by us, monetisable.
- Public web (SEO funnel back into the app).
- Expand to mainland UK.

---

## 5. Monetisation model

Four streams, layered intentionally so they don't cannibalise each other.

### A. Venue Pro subscription
- £/€19/month or £/€189/year per venue.
- Includes: featured carousel placement (rotating), unlimited photos/videos, analytics dashboard, event publishing, "respond to review", booking-link surfacing on detail page, monthly performance email.
- Multi-venue chains: tiered pricing or per-venue.
- Decision needed: do we offer a free tier with a claimable but read-only listing, or only paid? Recommendation: **freemium claim**. Anyone can claim (verified) and edit basics for free. Pro unlocks the marketing surface area.

### B. Parent Premium subscription
- £/€2.99/month or £/€24.99/year.
- Includes: ad-free, unlimited favourites & plans, advanced filters, school-holiday planner, partner discounts at participating venues (this is the wedge — partners get "Premium-only deal" labelling and a Premium-only audience).
- Free tier is generous to keep parent acquisition cheap.

### C. Booking commission / affiliate
- Where venues sell tickets via supported partners (Tiqets, GetYourGuide, Bókun, Roller, Checkfront, native Stripe), we deep-link with tracked URLs and take 5–15% depending on partner.
- Where Pro venues run their own booking, we surface their link and take a flat referral fee (or include in Pro for free as a perk).
- Long term: native checkout for small venues without a system.

### D. Promoted listings / ads
- Self-serve: a venue (Pro or not) can boost a listing for £/€2 per day, geo-bounded, capped per query so the feed never feels spammy.
- House rules: never more than 1 promoted slot per 6 organic results. Promoted = clearly labelled. No third-party ad networks.

### Why all four
- Venue Pro = the high-margin recurring base. Predictable.
- Parent Premium = aligned incentive (we earn when parents stay; ads off → trust up).
- Bookings = volume play; rises with engagement.
- Promoted = optional upsell for non-Pro venues, low-effort revenue.

If forced to pick one for MVP, it's **Venue Pro** — it directly funds the venue dataset that powers everything else.

---

## 6. Information architecture

### Screens (parent app)
- **Home** — weather + child-aware "today" picks, "this weekend", "school-holiday hub", recent favourites.
- **Discover** — map + list with filter sheet.
- **Detail** — venue page, photos, reviews, book/visit, save.
- **Plans** — saved baskets of activities.
- **Profile** — children, settings, premium status, support.

### Screens (venue portal — Phase 3+)
- Probably web-first, not native. Reuse the Supabase Auth session via a Next.js (or Remix) admin app at `admin.activityfinder.app`.
- **Listings** (claim, edit, photos).
- **Events** (one-off + recurring).
- **Analytics** (impressions, clicks, saves, profile visits, click-through to bookings).
- **Billing** (Stripe portal).
- **Reviews** (respond, flag).

---

## 7. Data model

We want a schema that supports all four monetisation streams from day one even if the features land later. Below is the conceptual model. SQL DDL lives in a follow-up file (`/supabase/schema.sql`).

### Core entities

**users** — every authenticated user (parent or venue owner — same login, different role memberships).
- `id` uuid PK (= `auth.users.id`)
- `email`, `display_name`, `avatar_url`
- `home_postcode`, `country_code` (`GB-NIR` | `IE`)
- `preferred_currency` (`GBP` | `EUR`)
- `preferred_distance_unit` (`mi` | `km`)
- `marketing_opt_in`, `created_at`

**children** — child profiles owned by a user. We store DOB so age is always current.
- `id` uuid PK
- `user_id` uuid FK
- `nickname`
- `dob` date
- `notes` text (allergies, accessibility — not exposed to venues)

**venues** — the canonical place.
- `id` uuid PK
- `slug` (unique, used in deep links)
- `name`, `description`
- `country_code` (`GB-NIR` | `IE`)
- `address_line1/2`, `town`, `postcode`
- `location` geography(Point, 4326) — PostGIS
- `phone`, `email`, `website`
- `price_band` enum (`free`, `low`, `mid`, `high`)
- `currency` (`GBP` | `EUR`) — display currency
- `indoor_outdoor` enum (`indoor`, `outdoor`, `both`)
- `min_age`, `max_age` (overall suitability)
- `accessibility_flags` jsonb (wheelchair, sensory-friendly, breastfeeding-friendly, changing places, pram-friendly, SEN-aware)
- `parking` enum, `public_transport` text
- `status` enum (`unclaimed`, `claimed`, `verified`, `pro`, `closed`)
- `tier` enum (`free`, `pro`)
- `created_at`, `updated_at`, `verified_at`

**venue_categories** — many-to-many.
- `venue_id`, `category_id`

**categories** — taxonomy.
- `id`, `slug`, `name_en`, `parent_id` (self-ref for hierarchy: "Indoor → Soft play").

**venue_owners** — link users to venues with a role.
- `user_id`, `venue_id`, `role` (`owner`, `editor`)

**venue_photos** — separate table so order/captions are easy.
- `venue_id`, `storage_path`, `position`, `caption`

**opening_hours** — per venue, per weekday, supports seasonal overrides via `valid_from`/`valid_to`.
- `venue_id`, `weekday`, `opens_at`, `closes_at`, `valid_from`, `valid_to`

**events** — one-off or recurring activities at a venue (a soft play has none, a museum has lots).
- `id`, `venue_id`, `title`, `description`
- `starts_at`, `ends_at`, `recurrence_rule` (RRULE iCal)
- `min_age`, `max_age`, `price`, `currency`
- `booking_url`, `booking_provider` enum

**reviews**
- `id`, `venue_id`, `user_id`
- `rating` int 1–5, `body`, `visit_date`
- `verified_visit` bool (geofence-confirmed)
- `status` enum (`pending`, `approved`, `rejected`)
- Photos in `review_photos`.

**favourites**
- `user_id`, `venue_id`, `created_at`

**plans** — a basket of activities for a day.
- `id`, `user_id`, `name`, `planned_date`
- `plan_items(plan_id, venue_id_or_event_id, position)`

**subscriptions** — both Parent Premium and Venue Pro live here, distinguished by `plan_type`.
- `id`, `user_id`, `venue_id` (nullable; null for Parent Premium)
- `plan_type` (`parent_premium`, `venue_pro`)
- `stripe_subscription_id`, `status`, `current_period_end`
- `currency`

**bookings_clicks** — tracks affiliate/booking link clicks for attribution.
- `id`, `user_id` (nullable for anon), `venue_id`, `event_id`, `provider`, `clicked_at`, `attributed_revenue`, `currency`

**promotions** — promoted listing slots.
- `id`, `venue_id`, `starts_at`, `ends_at`
- `geo_centre` geography, `geo_radius_m`
- `daily_budget`, `spend_to_date`, `status`

**school_terms** — seeded reference data, NI + ROI calendars.
- `id`, `region` (`NI` | `ROI` | `ROI-Dublin` etc.), `term_name`, `starts_on`, `ends_on`, `is_holiday`

### Relationships (key ones)
- `users 1—* children`
- `users 1—* venue_owners *—1 venues`
- `venues 1—* events`
- `venues 1—* reviews *—1 users`
- `venues 1—1 subscriptions` (Pro)
- `users 1—1 subscriptions` (Premium)

### Row Level Security (RLS) — sketch
- `children`: only the owner user can read/write.
- `venues`: anyone can read where `status != 'closed'`; only `venue_owners` (or admins) can update.
- `reviews`: anyone can read approved; only the author can update; venue owners can read pending for their own venue.
- `subscriptions`: only the owning user/venue and admins can read.
- `bookings_clicks`: only admins can read in aggregate; the owning user can read their own.

Use a `is_admin()` security definer function checked against a `staff` table to keep policies simple.

---

## 8. Technical architecture

### Stack
- **Mobile**: React Native via Expo (managed workflow). Expo Router for navigation. Expo's built-in EAS Build for CI. Drop to bare workflow only if a feature requires it (e.g. a third-party SDK without a config plugin).
- **Backend**: Supabase
  - Postgres + PostGIS for geo.
  - Supabase Auth (email, Apple, Google). Apple is mandatory for iOS if you have any social login.
  - Supabase Storage for venue/review photos. Public bucket for venue photos, private bucket for review-pending photos.
  - Edge Functions (Deno) for Stripe webhooks, scheduled jobs, affiliate redirect tracking.
  - Realtime subscriptions only where they pay rent (e.g. live event seat counts later).
- **Payments**: Stripe. Stripe Billing for both Parent Premium and Venue Pro. Stripe Connect not needed unless we do native checkout for venues.
- **Maps**: Mapbox GL Native (better RN integration than Google Maps in 2026 and cheaper at scale). Geocoding via Mapbox + a backup against Eircode-specific lookups (Eircode finder is paid; we may need a partner or scrape OS data carefully).
- **Search**: Postgres full-text + PostGIS for distance ordering for MVP. Move to Meilisearch only if we feel pain.
- **Push**: Expo Notifications.
- **Analytics**: PostHog (self-hostable, EU-region for GDPR).
- **Error tracking**: Sentry.
- **Email**: Resend (transactional) + a marketing tool later.

### Why Expo
- One codebase, both stores, OTA updates without app review for JS-only changes — invaluable when iterating early.
- 0–17 audience means no AR/sensor edge cases that bare RN would unblock.

### Why Supabase (vs Firebase or rolling our own)
- Postgres is non-negotiable for the relational shape of this domain (venues × categories × events × reviews × subscriptions).
- PostGIS is built in.
- RLS lets the mobile app talk to the DB directly safely — no API server to maintain in MVP.
- One trade-off: complex business logic (Stripe webhooks, affiliate attribution) lives in Edge Functions, not in the mobile app. That's fine.

### Repo layout (proposed)
```
activity-finder/
├─ apps/
│  └─ mobile/                # Expo RN app
│     ├─ app/                # Expo Router
│     ├─ components/
│     ├─ lib/                # supabase client, stripe, hooks
│     ├─ assets/
│     └─ app.json
├─ supabase/
│  ├─ migrations/            # versioned SQL
│  ├─ functions/             # Edge Functions (Deno)
│  │  ├─ stripe-webhook/
│  │  ├─ booking-redirect/
│  │  └─ daily-digest/
│  └─ seed/                  # CSV → SQL seed scripts
├─ docs/
│  ├─ DESIGN.md              # this file
│  ├─ DATA_MODEL.md
│  └─ DECISIONS/             # ADRs
├─ scripts/
└─ README.md
```

A monorepo structure makes adding the venue admin web app (Phase 3) trivial later (`apps/admin/`).

### Environments
- **local** — Supabase local dev (Docker), Expo Go.
- **staging** — Supabase project `activity-finder-staging`, EAS preview channel.
- **production** — Supabase project `activity-finder-prod`, EAS production channel.

### Auth & roles
A user can be a parent, a venue owner, both, or staff. We don't model roles globally; we model them by relationship:
- Parent role implicit (anyone with an account).
- Venue owner = row in `venue_owners`.
- Staff = row in `staff`.

This avoids a brittle global role system.

---

## 9. Trust, safety, and moderation

This is a product about families. Even a single bad incident damages the brand permanently.

- No public-facing user content involves children's names or photos. Children are private to the parent's account.
- Reviews go through a moderation queue. MVP: human moderation by us; later: ML pre-screen + human spot-check. Reject reviews with PII, naming staff, or anything mentioning children's identities.
- Photos in reviews are screened before publication.
- Block & report flows on every user-generated surface.
- Venues cannot DM parents. There is no DM surface in the app.
- Verified-visit reviews carry visual weight; unverified are still allowed but ranked lower.

---

## 10. Privacy & compliance

- EU GDPR + UK GDPR. Treat as one stricter regime in code.
- A clear privacy policy and DPA with Supabase. Supabase EU region (Frankfurt or Dublin) is essential for ROI users.
- Children's data: we store DOB and a nickname. We never share this with venues. Document this clearly.
- Right-to-erasure: a "delete my account" flow that cascades to children, favourites, plans, reviews (anonymised). Test it before launch.
- Cookie/tracking consent in the venue admin web app (cookies aren't applicable to native).
- App Store privacy labels: prepare these early; they delay launches if missed.

---

## 11. Roadmap (rough, monthly)

| Month | Theme | Deliverables |
|---|---|---|
| M1 | Foundations | First commit, repo scaffold, Supabase project, schema v1, Expo skeleton, Mapbox integration, ~50 seeded venues. |
| M2 | Discovery | Map + list + filters, venue detail, favourites, search. Parent auth. |
| M3 | Polish + dataset | Photo handling, weather integration, school-term filter, push reminders. Grow seed to 500+ venues. |
| M4 | Closed beta | TestFlight + Play internal. 100 NI + ROI families. Iterate. |
| M5 | Reviews + plans | Review system with moderation, plans basket, sharing. |
| M6 | Public launch (parent app) | App Store + Play Store. PR push: BBC NI, RTÉ Today, parenting Instagram, mum/dad WhatsApp groups. |
| M7 | Venue admin (web) | Claim flow, basic editing. |
| M8 | Venue Pro launch | Stripe Billing, featured placement, analytics dashboard. |
| M9 | Parent Premium | Subscription, advanced filters, school-holiday planner, partner deals. |
| M10 | Bookings & affiliates | Tracked deep links, partner integrations (Tiqets, GetYourGuide). |
| M11 | Promoted listings | Self-serve, geo-bounded, capped. |
| M12 | Scale prep | Performance, search migration if needed, expand to GB. |

---

## 12. Risks & open questions

### Risks
- **Cold-start of venue data.** Without 500+ venues at launch the app dies. Phase 0 dataset work is non-negotiable. Consider a research grant from Tourism NI / Fáilte Ireland to underwrite data collection.
- **Two-sided cold start.** Venues won't pay until parents are using it; parents won't use it without venues. Solve the venue side first (we control it), then earn the parent side.
- **App Store gatekeeping for child-related apps.** Apple is strict. Be careful with copy, kids' modes, advertising labels.
- **Eircode licensing.** Eircode is licensed; we likely need a commercial agreement or a workaround (rely on Mapbox geocoding with town + street).

### Open questions to decide before first commit
1. Free claim or paid-only listing? (Recommendation: free claim, Pro for marketing.)
2. App name. "Activity Finder" is a working title; trademark and App Store availability check needed.
3. Does the venue admin app live in this repo (monorepo) or separately? (Recommendation: monorepo.)
4. Mapbox vs Google Maps — final pick. (Recommendation: Mapbox for cost + RN ergonomics.)
5. Pricing for Pro: per-venue or chain pricing for groups like Streamvale, Pickie Park, etc.?
6. Do we soft-launch in one region (e.g. Greater Belfast + Greater Dublin) before going wider?

---

## 13. First commit checklist

Right now the repo is empty. The first commit should land:

1. `README.md` — one-paragraph project description, dev quickstart placeholder.
2. `.gitignore` — Node, Expo, macOS, Supabase, env files.
3. `LICENSE` — choose one (recommendation: keep proprietary while pre-launch; switch later if needed).
4. `docs/DESIGN.md` — this file.
5. `package.json` at repo root with workspaces config (or skip until Expo app is added).
6. `.editorconfig` and `.nvmrc` for consistency.
7. A short `CONTRIBUTING.md` even if it's just you — future-self gift.

Suggested first commit message:
```
chore: initial commit — design doc, repo scaffold, gitignore
```

Then in a follow-up branch: scaffold the Expo app under `apps/mobile/` and the Supabase project under `supabase/`.

---

## 14. Appendix — naming, brand, tone

- Tone: warm, practical, parental but not saccharine. "Out today?" not "Embark on a magical family adventure!"
- Voice example (push notification): *"Half-term hits Friday. Want a list of 12 indoor picks within 20 min of you?"*
- Visuals: muted, photo-led, less primary-colour kindergarten energy than competitors. The audience is the parent, not the kid.
- Accessibility: WCAG AA from day one. Large hit targets, dyslexia-friendly default font (Inter or Atkinson Hyperlegible).

---

*End of v0.1 draft. Next iteration should fold in answers to section 12 open questions, plus a separate `DATA_MODEL.md` with full SQL DDL.*
