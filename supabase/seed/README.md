# Seed data

Reference data and sample fixtures for local dev and staging.

- `categories.sql` — taxonomy. Run after migrations.
- `school_terms.sql` — NI + ROI school calendars. Refresh annually.
- `venues.sample.csv` — a handful of well-known venues to make the app non-empty
  during local development. Production seed lives in a private dataset.

To load the sample venues locally, use `scripts/seed-venues.ts` (parses CSV,
geocodes if lat/lng missing, inserts via the Supabase service role key).

Notes for the seed-venues implementation:

- The CSV omits a `currency` column. The schema requires `venues.currency NOT NULL`,
  so derive it from `country_code`: `GB-NIR` → `GBP`, `IE` → `EUR`.
- `categories` is a semicolon-separated list of category slugs. After upserting
  the venue, look up category IDs by slug and upsert into `venue_categories`.
- If `slug` is missing, generate one from `name` + `town` (lowercase, dashed,
  ASCII-only). The schema treats `venues.slug` as `citext UNIQUE`.
