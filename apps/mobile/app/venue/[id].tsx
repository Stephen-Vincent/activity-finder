/**
 * Venue detail screen.
 *
 * Route: /venue/<slug-or-id>
 *
 * Sections:
 *  - Hero photo carousel.
 *  - Name, category chips, age suitability, price band.
 *  - "Open now" / next opening time, today's hours.
 *  - Description.
 *  - Accessibility flags.
 *  - Map snippet + "Get directions" deep link.
 *  - Upcoming events at this venue.
 *  - Reviews + "Write a review" (Phase 2).
 *  - Save / Add to plan / Share.
 *  - Booking CTA (deep-link to partner with tracked URL — Phase 4).
 *
 * Pro venues get: rotated hero placement upstream, response-to-reviews,
 *   gallery > 3 photos, booking link prioritised. The detail screen itself
 *   adapts via the `tier` field on the venue.
 */

// import { useLocalSearchParams } from 'expo-router';

export default function VenueDetailScreen() {
  // const { id } = useLocalSearchParams<{ id: string }>();
  // TODO: fetch venue by id, render.
  return null;
}
