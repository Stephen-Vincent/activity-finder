/**
 * Centralised Supabase query functions.
 *
 * Each function is a thin wrapper around supabase-js so call sites stay
 * declarative and types are inferred from the generated `Database` type.
 *
 * Conventions:
 *  - Functions return the raw rows, not Supabase's { data, error } envelope.
 *    Callers should throw via `throwIfError(error)` helper.
 *  - Geo queries hit Postgres RPCs that wrap PostGIS:
 *      rpc('venues_within', { lng, lat, radius_m, filters }).
 *  - All filtered list queries support cursor pagination (use `id` + `created_at`).
 */

export {};
