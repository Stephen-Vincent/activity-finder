/**
 * Supabase client (mobile).
 *
 * The single way the app talks to the database, auth, and storage.
 * Always import the `supabase` export from here — never call `createClient`
 * elsewhere, or we'll end up with two clients fighting over the session.
 *
 * Env vars (set in apps/mobile/.env, see .env.example at the repo root):
 *   EXPO_PUBLIC_SUPABASE_URL              — e.g. http://127.0.0.1:54321 locally
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — Supabase's "publishable key"
 *                                           (was called "anon key" until late 2025;
 *                                           safe to ship in the mobile bundle)
 *
 * NEVER read the secret key (formerly "service role key") from this file —
 * it bypasses Row Level Security and must stay server-side (Edge Functions,
 * scripts, CI). Anything secret would also be visible to anyone with the .ipa
 * or .apk if it lived here.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Fail loudly on app boot instead of producing a mysterious "Failed to fetch"
  // the first time we hit a query. Reload the bundler after editing .env.
  throw new Error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to ' +
      'apps/mobile/.env, paste the values from `npm run supabase:start`, ' +
      'and restart Metro.',
  );
}

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // Persist the user's session in AsyncStorage so the app stays signed in
    // across launches.
    storage: AsyncStorage,
    // Refresh the access token in the background before it expires.
    autoRefreshToken: true,
    persistSession: true,
    // We're a native app, not a website — there's no URL bar for Supabase to
    // sniff a magic-link token out of. The deeplink that returns from the
    // browser is parsed by lib/auth/deeplink.ts (to be added) which then
    // hands the tokens back to supabase.auth.setSession().
    detectSessionInUrl: false,
  },
});

export type SupabaseClient = typeof supabase;
