/**
 * VenueList
 *
 * Virtualised list of VenueCard. Wraps FlashList (preferred) or FlatList.
 * Handles infinite scroll via TanStack Query's `useInfiniteQuery` + a
 * Postgres RPC `venues_within(centre, radius, filters, cursor)`.
 *
 * Props: { filters: VenueFilters, ListHeaderComponent?, ListEmptyComponent? }
 */

export default function VenueList() {
  // TODO: implement.
  return null;
}
