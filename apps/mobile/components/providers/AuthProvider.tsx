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
 *      we call `setSession()` from a deep link.
 *   3. Subscribes to incoming deep links via expo-linking. When the OS hands
 *      us a URL with `access_token` / `refresh_token` in the fragment, we
 *      hand the pair to Supabase, which finishes the sign-in. (Used by future
 *      Apple / Google / password-reset flows; the current OTP code flow does
 *      not need this.)
 *   4. Whenever a session appears, fetches the matching `public.users` row —
 *      the "profile" — so the UI can show display name, home postcode etc
 *      without each screen having to re-query.
 *
 * What `loading` means: the very first auth lookup hasn't returned yet. It
 * flips to `false` once we know whether there's a session, regardless of
 * which way the answer fell. The root navigator uses this to decide whether
 * to render the splash, the auth stack, or the tabs.
 *
 * What `profileLoading` means: there's a session, but we haven't loaded the
 * public.users row yet. AuthGate uses this to avoid a flash of the wrong
 * screen between "session arrived" and "we know whether they've onboarded."
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { parseAuthDeeplink } from '@/lib/auth/deeplink';
import { profileFromRow, type Profile } from '@/types/domain';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the first session lookup finishes. After that, never true again. */
  loading: boolean;
  /** True while the public.users row is being fetched after a session appears. */
  profileLoading: boolean;
  /** Re-read the profile from the DB. Call this after onboarding writes. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Guard against double-handling the same deep link. If the OS delivers the
  // initial URL and then also fires a `url` event for the same URL (it can,
  // briefly, on warm starts), we don't want to call setSession twice.
  const handledUrls = useRef<Set<string>>(new Set());

  // We need the current user's id from inside refreshProfile, but we also
  // want refreshProfile to be stable enough that screens can put it in
  // useEffect deps without infinite loops. A ref to the user is the simplest
  // way to get both.
  const userRef = useRef<User | null>(null);
  userRef.current = session?.user ?? null;

  const loadProfile = useCallback(async (forUser: User | null) => {
    if (!forUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', forUser.id)
      .maybeSingle();

    if (error) {
      // Don't blow up the UI — log and leave profile null. AuthGate will
      // treat null-profile as "still loading" so we don't bounce the user
      // out to sign-in over a transient query failure.
      console.warn('[auth] failed to load profile', error.message);
      setProfile(null);
    } else if (data) {
      setProfile(profileFromRow(data));
    } else {
      // No row yet — handle_new_user trigger should have created one, but
      // there's a race window on first sign-in. Try again soon. Leaving
      // profile as null is the right default; AuthGate will spin.
      setProfile(null);
    }
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(userRef.current);
  }, [loadProfile]);

  useEffect(() => {
    let active = true;

    // 1. Bootstrap from cached session.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user ?? null);
    });

    // 2. Subscribe to future auth events.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      void loadProfile(nextSession?.user ?? null);
    });

    // 3. Handle deep links — for future Apple / Google / password-reset flows.
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
        console.warn('[auth] setSession from deep link failed', error.message);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading, profileLoading, refreshProfile],
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
