/**
 * Analytics wrapper around PostHog (EU region).
 *
 * Exposes:
 *   - identify(userId, traits)
 *   - track(event, props)
 *   - screen(name, props)
 *   - reset()  // on sign-out
 *
 * Honours the user's `marketing_opt_in` flag for non-essential events.
 * Essential events (errors, sign-up, sign-out) are always sent.
 */

export {};
