# Data Model

This file is the single source of truth for the database schema once it's authored. Until then, treat [DESIGN.md §7](./DESIGN.md#7-data-model) as the spec.

## Status

Draft / pending. Schema lives in `supabase/migrations/0001_init.sql` (currently a stub).

## How to update this doc

When the schema changes:

1. Add a new migration under `supabase/migrations/` (e.g. `0002_add_venue_amenities.sql`).
2. Update the relevant table section in this file with the new columns/constraints.
3. Regenerate types: `supabase gen types typescript --local > apps/mobile/types/database.ts`.
4. Note breaking changes in the PR description.

## Sections (to be filled)

- Extensions
- Enums
- Tables (alphabetical: bookings_clicks, categories, children, events, favourites, opening_hours, plan_items, plans, promotions, review_photos, reviews, school_terms, staff, subscriptions, users, venue_categories, venue_owners, venue_photos, venues)
- Indexes
- Functions / RPCs
- RLS policies
- Triggers
- Views

## ER diagram

A Mermaid ER diagram lives here once the schema settles. Sketch:

```
users 1—* children
users 1—* venue_owners *—1 venues
venues 1—* events
venues 1—* venue_photos
venues *—* categories (via venue_categories)
venues 1—* reviews *—1 users
venues 1—1 subscriptions  (Pro)
users   1—1 subscriptions  (Premium)
users 1—* favourites *—1 venues
users 1—* plans 1—* plan_items
```
