/**
 * Root layout for Expo Router.
 *
 * This file is the only place we wrap the whole app in providers — every
 * screen renders inside it. Keep it thin: provider implementations live in
 * `components/providers/`.
 *
 * Order matters. Outer providers can be read by inner ones, but not the
 * other way round:
 *   SafeAreaProvider           — needed by anything that calls useSafeAreaInsets
 *   GestureHandlerRootView     — required by react-native-gesture-handler
 *   AuthProvider               — exposes useAuth() to every screen
 *   AuthGate                   — watches session and route, redirects on mismatch
 *
 * QueryProvider, theme, Sentry, and PostHog are stubs for now and will slot
 * in here later, between AuthProvider and the navigator.
 *
 * About the AuthGate: a redirect from `app/index.tsx` only fires when the
 * user is on `/`. Once they're on `/auth/sign-in` or `/(tabs)/home`, that
 * file isn't mounted, so it can't react to a sign-in or sign-out. AuthGate
 * fills that gap — it sits inside the navigator, watches `session` plus the
 * current route segment, and bounces between groups when they don't agree.
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // While the initial session lookup is in flight, don't move anyone — the
    // OS splash is still up and we don't want a flash of the wrong screen.
    if (loading) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === 'auth';

    if (!session && !inAuthGroup) {
      // Signed out and looking at a protected screen → go to sign-in.
      router.replace('/auth/sign-in');
    } else if (session && inAuthGroup) {
      // Signed in but somehow still on the auth screens → go home.
      router.replace('/(tabs)/home');
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AuthGate>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGate>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
