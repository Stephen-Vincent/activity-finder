/**
 * Edge Function: booking-redirect
 *
 * Public endpoint that records an affiliate/booking link click and 302-redirects
 * the user to the partner URL. Acts as our attribution layer.
 *
 * Route shape:
 *   GET /functions/v1/booking-redirect?venue=<uuid>&event=<uuid?>&provider=<slug>
 *
 * Steps:
 *   1. Validate query params.
 *   2. Look up the venue + event, build the partner URL with the correct
 *      partner ID and click ID parameters (Tiqets, GetYourGuide, Bókun, etc.).
 *   3. Insert a row into `bookings_clicks`.
 *   4. Return 302 to the partner URL.
 *
 * Deploy: `supabase functions deploy booking-redirect --no-verify-jwt`
 */

export {};
