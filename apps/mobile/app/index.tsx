/**
 * Entry route. Redirects based on auth + onboarding state:
 *  - No session -> /auth/sign-in
 *  - Session but no children added -> /onboarding
 *  - Otherwise -> /(tabs)/home
 *
 * This file purposely contains no UI of its own.
 */

// import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: read auth + profile state, return appropriate <Redirect />
  return null;
}
