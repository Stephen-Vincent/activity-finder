/**
 * AuthProvider
 *
 * Owns the answer to "is anyone signed in, and if so, who?" — and pushes that
 * answer into React context so the rest of the app can read it without ever
 * touching the Supabase client directly.
 *
 * What it does on mount:
 *   1. Asks Supabase for the current session (it might already be cached in
 *      AsyncStorage from a previous launch).
 *   2. Subscribes to `supabase.auth.onAuthStateChange` so it picks up sign-ins
 *      and sign-outs that happen later — including the one that fires after
 *      we call `setSession()` from a magic-link deep link.
 *   3. Subscribes to incoming deep links via expo-linking. When the OS hands
 *      us a URL with `access_token` / `refresh_token` in the fragment, we
 *      hand the pair to Supabase, which finishes the sign-in.
 *
 * What `loading` means: the very first auth lookup hasn't returned yet. It
 * flips to `false` once we know whether there's a session, regardless of
 * which way the answer fell. The root navigator can use this to decide
 * whether to render the splash, the auth stack, or the tabs.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { parseAuthDeeplink } from '@/lib/auth/deeplink';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the first session lookup finishes. After that, never true again. */
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard against double-handling the same deep link. If the OS delivers the
  // initial URL and then also fires a `url` event for the same URL (it can,
  // briefly, on warm starts), we don't want to call setSession twice.
  const handledUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    // 1. Bootstrap from cached session (AsyncStorage) — quick and synchronous-ish.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    // 2. Subscribe to future auth events.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      // If onAuthStateChange fires before getSession resolves (rare but possible),
      // we still want loading to flip false.
      setLoading(false);
    });

    // 3. Handle deep links.
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (handledUrls.current.has(url)) return;
      const tokens = parseAuthDeeplink(url);
      if (!tokens) return;
      handledUrls.current.add(url);
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) {
        // We don't surface this in the UI yet — the sign-in screen still shows
        // the "check your email" state, which the user can dismiss. Once we
        // have a toast system, route this through it.
        console.warn('[auth] setSession from deep link failed', error.message);
      }
    };

    // The URL the app was launched with (if any).
    Linking.getInitialURL().then(handleUrl);

    // URLs delivered while the app is already running.
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read auth state from anywhere in the app. Throws if used outside an
 * <AuthProvider>, which is a programming error — the provider is mounted
 * once at the root.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
