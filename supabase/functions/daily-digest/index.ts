/**
 * Edge Function: daily-digest
 *
 * Scheduled (via Supabase cron) to run once per day. Computes a per-user
 * suggestion list and sends a push notification (Expo) or email (Resend)
 * for users who have opted in.
 *
 * Logic outline:
 *   - Pull users with notifications_opt_in = true.
 *   - For each, compute today's top 3 picks given their children, home location,
 *     weather, and school-holiday status.
 *   - Skip if user has been active in the last 24h (don't be annoying).
 *   - Send push via Expo Push API.
 *
 * Schedule: `supabase functions schedule daily-digest --cron "0 7 * * *"`
 */

export {};
