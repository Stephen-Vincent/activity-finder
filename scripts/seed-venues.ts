/**
 * scripts/seed-venues.ts
 *
 * Reads supabase/seed/venues.sample.csv (or any CSV passed via --file),
 * geocodes any rows missing lat/lng using Mapbox, and upserts into
 * public.venues using the Supabase service role key.
 *
 * Usage:
 *   npx tsx scripts/seed-venues.ts --file ./supabase/seed/venues.sample.csv
 *
 * Env vars required:
 *   SUPABASE_DB_URL or (EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *   EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN  (Mapbox geocoding works with public tokens)
 *
 * Idempotent: upserts on (slug). If a row has no slug, generate one from name + town.
 */

// TODO: implement.
export {};
