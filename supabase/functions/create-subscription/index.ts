/**
 * Edge Function: create-subscription
 *
 * Called from the mobile app to start a Parent Premium subscription.
 * Required because the mobile client must not see the Stripe secret key.
 *
 * Steps:
 *   1. Authenticate the caller via Supabase JWT (verify_jwt = true).
 *   2. Find or create a Stripe Customer matching auth.uid().
 *   3. Create a Subscription with the Premium price ID, trial if applicable.
 *   4. Return { clientSecret, subscriptionId } so the app can confirm via
 *      @stripe/stripe-react-native.
 *
 * Mirror function for venue-side flows lives in the web admin app
 * (Phase 3) since Venue Pro is signed up there.
 */

export {};
