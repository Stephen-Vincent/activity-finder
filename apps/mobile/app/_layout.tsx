/**
 * Root layout for Expo Router.
 *
 * Responsibilities:
 *  - Wrap the app in providers: SafeArea, GestureHandler, QueryClient (TanStack Query),
 *    Supabase auth context, theme, Sentry, PostHog.
 *  - Decide initial route based on auth state (signed in -> tabs, signed out -> auth/sign-in).
 *  - Configure deep links (activityfinder://venue/<slug>, etc).
 *
 * Keep this file thin. Provider implementations live in components/providers/.
 */

// import { Stack } from 'expo-router';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { QueryProvider } from '@/components/providers/QueryProvider';
// import { AuthProvider } from '@/components/providers/AuthProvider';

export default function RootLayout() {
  // TODO: wire up providers and Stack with auth-aware redirect logic.
  return null;
}
