/**
 * Edge Function: stripe-webhook
 *
 * Receives Stripe events and reconciles them with our `subscriptions` table.
 * Verifies the signature using STRIPE_WEBHOOK_SECRET.
 *
 * Events we care about:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 *   - checkout.session.completed   // first-time Pro / Premium activation
 *
 * On `subscription.*`, upsert into `subscriptions` keyed by stripe_subscription_id
 * and update the linked user (Parent Premium) or venue (Venue Pro) tier flag.
 *
 * Deploy: `supabase functions deploy stripe-webhook --no-verify-jwt`
 * (no JWT verification because Stripe calls this directly).
 */

// import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// serve(async (req) => {
//   // 1. Verify Stripe signature.
//   // 2. Switch on event.type.
//   // 3. Upsert into subscriptions, update flags.
//   // 4. Return 200.
// });

export {};
