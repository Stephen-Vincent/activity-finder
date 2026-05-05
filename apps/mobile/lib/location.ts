/**
 * Thin wrapper around expo-location.
 *
 * Reasons this exists rather than calling expo-location directly:
 *   - we want a single, consistent place to handle "permission denied" /
 *     "GPS turned off" / "took too long" cases without every screen
 *     re-implementing the same try/catch.
 *   - the failure types are explicit, so callers can decide whether to show
 *     an inline message ("permission needed") or a more dramatic alert.
 *
 * Foreground permission is enough for our use case — we only need a single
 * coordinate at the moment of "find places near me". Background location is
 * a bigger ask (App Review, ongoing battery cost) and not justified yet.
 *
 * Requires NSLocationWhenInUseUsageDescription on iOS — already set in
 * apps/mobile/app.json. Android picks up the permissions array there too.
 */

import * as Location from 'expo-location';

export type LocationOk = { ok: true; lat: number; lng: number };
export type LocationFail = {
  ok: false;
  /**
   * - 'denied'      — user said no when asked, or had previously said no.
   * - 'unavailable' — GPS hardware off or no fix available.
   * - 'error'       — anything else (timeout, OS error etc.).
   */
  reason: 'denied' | 'unavailable' | 'error';
  message?: string;
};
export type LocationResult = LocationOk | LocationFail;

export async function getCurrentLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const services = await Location.hasServicesEnabledAsync();
  if (!services) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'Location services are turned off on this device.',
    };
  }

  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { ok: true, lat: coords.latitude, lng: coords.longitude };
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : 'Could not read your location.',
    };
  }
}
