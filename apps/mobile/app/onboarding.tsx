/**
 * First-run onboarding (after sign-up).
 *
 * Steps:
 *  1. Welcome.
 *  2. Home location: postcode (NI) or Eircode (ROI). We geocode via Mapbox.
 *  3. Add children: one or more (nickname + DOB).
 *  4. Permissions: location prompt, notifications prompt.
 *  5. Done -> /(tabs)/home.
 *
 * Each step is its own component but lives in this single file for now.
 * Persists to `users` and `children` tables.
 */

export default function OnboardingScreen() {
  // TODO: implement step state machine.
  return null;
}
