# Seed data

Reference data and sample fixtures for local dev and staging.

- `categories.sql` — taxonomy. Run after migrations.
- `school_terms.sql` — NI + ROI school calendars. Refresh annually.
- `venues.sample.csv` — a handful of well-known venues to make the app non-empty
  during local development. Production seed lives in a private dataset.

To load the sample venues locally, use `scripts/seed-venues.ts` (parses CSV,
geocodes if lat/lng missing, inserts via the Supabase service role key).
