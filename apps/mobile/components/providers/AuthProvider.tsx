/**
 * AuthProvider
 *
 * Wraps the app and exposes auth state via context:
 *   { session, user, profile, loading, signIn, signOut }
 *
 * Subscribes to Supabase auth state changes. Loads `users` row + `children`
 * once a session exists. Handles deep-link callbacks (magic link, OAuth).
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO: implement.
  return <>{children}</>;
}
