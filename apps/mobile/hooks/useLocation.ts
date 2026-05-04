/**
 * useLocation
 *
 * Resolves the user's "current centre" for distance queries:
 *   1. Precise device location (if permission granted and recent fix).
 *   2. Otherwise the home location stored on the user's profile.
 *   3. Otherwise a sensible fallback (Belfast city centre or Dublin city centre
 *      based on country preference).
 *
 * Returns: { centre: [lng, lat], source: 'device' | 'home' | 'fallback', refresh }
 */

export {};
