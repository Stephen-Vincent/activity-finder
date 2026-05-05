/**
 * Deep-link → Supabase session glue.
 *
 * When the user taps the magic-link in their inbox, the operating system opens
 * our app via the `activityfinder://` URL scheme. Supabase appends the auth
 * tokens to the URL as a fragment (the bit after `#`), like:
 *
 *   activityfinder://auth/callback#access_token=...&refresh_token=...&expires_in=3600&token_type=bearer&type=magiclink
 *
 * This file owns one job: pull `access_token` and `refresh_token` out of that
 * URL. The AuthProvider then hands them to `supabase.auth.setSession()`, which
 * is what actually signs the user in.
 *
 * Why a separate file? It keeps the parsing logic testable on its own, away
 * from React. `parseAuthDeeplink` is a pure function — no Linking, no Supabase
 * — so we can throw any string at it in a unit test.
 */

export type AuthDeeplinkTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Pull `access_token` and `refresh_token` from a Supabase auth deep link.
 *
 * Returns `null` for anything that isn't a recognisable auth callback URL
 * (including the home screen launch URL, random `activityfinder://venue/foo`
 * deep links, etc.). The caller can safely call this on every URL the OS
 * delivers — only legitimate auth callbacks come back with tokens.
 *
 * Supabase puts the tokens in the URL **fragment** (after `#`), not the query
 * string, because fragments aren't sent to servers — so the tokens never leak
 * into web logs or analytics. We have to parse the fragment ourselves.
 */
export function parseAuthDeeplink(url: string | null | undefined): AuthDeeplinkTokens | null {
  if (!url) return null;

  // The fragment is everything after the first `#`. If there's no `#`, this
  // isn't an auth callback URL.
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const fragment = url.slice(hashIndex + 1);
  if (!fragment) return null;

  // URLSearchParams handles `key=value&key=value` perfectly well, even though
  // the input came from a URL fragment rather than a query string.
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
