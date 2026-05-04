/**
 * Discover tab — the core experience.
 *
 * Layout:
 *  - Top: search bar + active filter chips.
 *  - Toggle: Map view <-> List view.
 *  - Bottom sheet: filter editor (age, distance, category, indoor/outdoor,
 *    price band, open now, accessibility flags).
 *
 * Map: components/MapView.tsx (Mapbox).
 * List: components/VenueList.tsx with infinite scroll.
 *
 * Geo query is handled server-side via a Postgres RPC (`venues_within`)
 * that uses PostGIS ST_DWithin. See lib/supabase/queries.ts.
 */

export default function DiscoverScreen() {
  // TODO: implement.
  return null;
}
