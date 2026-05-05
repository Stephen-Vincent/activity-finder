/**
 * Entry route — the first thing the user lands on.
 *
 * This file deliberately renders no UI of its own. Its job is to look at the
 * auth state and bounce the user to the right place:
 *
 *   - Still loading the initial session?  → render nothing (we'll add a
 *     splash component later; for now React Native's launch screen covers
 *     the few hundred ms it takes).
 *   - No session?                          → /auth/sign-in
 *   - Session?                             → /(tabs)/home
 *
 * Onboarding (the "add your children" flow) will sit between sign-in and
 * the tabs once it's implemented. We'll re-add the redirect to /onboarding
 * here when there's something to redirect to.
 */

import { Redirect } from 'expo-router';

import { useAuth } from '@/components/providers/AuthProvider';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    // The OS splash is still on screen during the initial getSession() call,
    // so rendering null here is fine. Replace with a branded splash component
    // once we have one.
    return null;
  }

  if (!session) {
    return <Redirect href="/auth/sign-in" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
