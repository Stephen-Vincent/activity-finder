/**
 * Stripe client wrapper for the mobile app.
 *
 * Uses @stripe/stripe-react-native. Subscriptions for Parent Premium are
 * created server-side via a Supabase Edge Function (`create-subscription`)
 * which returns a PaymentIntent client secret.
 *
 * Venue Pro subscriptions are managed in the web admin app, not here.
 */

export {};
